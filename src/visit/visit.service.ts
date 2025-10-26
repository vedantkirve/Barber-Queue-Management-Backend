import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { BarberShopService } from '../barber-shop/barber-shop.service';
import { UserService } from '../user/user.service';
import { VisitServiceService } from '../visit-service/visit-service.service';
import { Prisma, Visit } from '@prisma/client';
import { CreateVisitDto } from './dto/create-visit.dto';
import { ShopQueueService } from 'src/shop-queue/shop-queue.service';
import { QueueState } from 'src/common/enums/queue-state.enum';

@Injectable()
export class VisitService {
  constructor(
    private readonly barberShopService: BarberShopService,
    private readonly userService: UserService,
    private readonly visitServiceService: VisitServiceService,
    private readonly shopQueueService: ShopQueueService,
  ) {}

  async createVisit(
    createVisitDto: CreateVisitDto,
    userId: string,
    prisma: any,
  ) {
    const { barberShopId, services, totalAmount, customerInfo, shopQueueId } =
      createVisitDto;

    // 1. Check if valid shop exists using BarberShopService
    const shop = await this.barberShopService.getShop(barberShopId, prisma);

    if (!shop) {
      throw new NotFoundException('Barber shop not found');
    }

    // 2. Check if all services are valid and belong to this shop
    const shopServiceIds = shop.services.map((service) => service.id);
    const requestedServiceIds = services.map((service) => service.serviceId);

    // Check if all requested services exist in this shop
    const invalidServices = requestedServiceIds.filter(
      (serviceId) => !shopServiceIds.includes(serviceId),
    );

    if (invalidServices.length > 0) {
      throw new BadRequestException({
        message: 'Invalid services provided',
        error: `Services with IDs ${invalidServices.join(', ')} do not belong to this shop`,
      });
    }

    // 3. Handle user creation/lookup for customers
    let visitUserId = customerInfo?.userId || null;

    if (!visitUserId && customerInfo?.phoneNumber) {
      // Try to find existing user by phone number
      const existingUser = await this.userService.findUserByPhoneNumber(
        customerInfo.phoneNumber,
        prisma,
      );

      if (existingUser) {
        visitUserId = existingUser.id;
      } else {
        // User not found, create new user with phone number
        const newUser = await this.userService.createUnregisteredUser(
          { phoneNumber: customerInfo.phoneNumber },
          prisma,
        );
        visitUserId = newUser.id;
      }
    } else if (!visitUserId) {
      // No phone number provided, create new user with random email
      const newUser = await this.userService.createUnregisteredUser({}, prisma);
      visitUserId = newUser.id;
    }

    // 4. Create the visit
    const visit: Visit = await prisma.visit.create({
      data: {
        userId: visitUserId,
        shopQueueId,
        barberShopId,
        totalAmount,
        status: 'active',
      },
    });

    // 5. Create visit services
    const visitServices = await Promise.all(
      services.map(async (service: any) => {
        return await prisma.visitService.create({
          data: {
            visitId: visit.id,
            serviceId: service.serviceId,
            chargedPrice: service.chargedPrice,
          },
        });
      }),
    );

    return {
      ...visit,
      services: visitServices,
      shop: {
        id: shop.id,
        name: shop.name,
        address: shop.address,
      },
      customer: visitUserId ? { id: visitUserId } : null,
    };
  }

  // Get all visits by barber shop ID or user ID
  async getVisitsByBarberShopOrUser(
    prisma: any,
    barberShopId?: string,
    userId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    if (!barberShopId && !userId) {
      throw new BadRequestException(
        'Either barberShopId or userId must be provided',
      );
    }

    const whereClause: any = {
      status: 'active', // Only show active visits
    };

    if (barberShopId) {
      whereClause.barberShopId = barberShopId;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await prisma.visit.count({
      where: whereClause,
    });

    // Get paginated visits
    const visits = await prisma.visit.findMany({
      where: whereClause,
      include: {
        barberShop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        visitServices: {
          where: { status: 'active' },
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                price: true,
                estimatedTime: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      visits,
      pagination: {
        currentPage: page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  // Get analytics data for visits and revenue by date range
  async getAnalytics(
    prisma: any,
    startDate: Date,
    endDate: Date,
    barberShopId: string,
  ) {
    // Validate barber shop exists
    const shop = await this.barberShopService.getShop(barberShopId, prisma);
    if (!shop) {
      throw new NotFoundException('Barber shop not found');
    }

    // Get visits grouped by date with revenue using raw SQL for proper date grouping
    const visitsData = await prisma.$queryRaw`
    SELECT 
      DATE("createdAt" AT TIME ZONE 'UTC') as date,
      COUNT(*) as visits,
      SUM("totalAmount") as revenue
    FROM "Visit" 
    WHERE "barberShopId" = ${barberShopId}
      AND "createdAt" >= ${startDate}
      AND "createdAt" < ${new Date(endDate.getTime() + 24 * 60 * 60 * 1000)}
      AND status = 'active'
    GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
    ORDER BY DATE("createdAt" AT TIME ZONE 'UTC');
  `;

    // Transform data to include date, visits count, and revenue
    const analyticsData = visitsData.map((item) => ({
      date: item.date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      visits: Number(item.visits), // Convert BigInt to Number
      revenue: Number(item.revenue) || 0, // Ensure revenue is Number
    }));

    // Fill in missing dates with zero values
    const filledData = this.fillMissingDates(analyticsData, startDate, endDate);

    // Calculate summary statistics
    const totalVisits = filledData.reduce((sum, item) => sum + item.visits, 0);
    const totalRevenue = filledData.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );
    const averageVisitsPerDay = totalVisits / filledData.length;
    const averageRevenuePerDay = totalRevenue / filledData.length;

    return {
      data: filledData,
      summary: {
        totalVisits,
        totalRevenue,
        averageVisitsPerDay: Math.round(averageVisitsPerDay * 100) / 100,
        averageRevenuePerDay: Math.round(averageRevenuePerDay * 100) / 100,
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        barberShop: {
          id: shop.id,
          name: shop.name,
        },
      },
    };
  }

  // Deactivate visit and its associated visit services
  async deleteVisit(visitId: string, prisma: any) {
    // Check if the visit exists
    const existingVisit = await prisma.visit.findUnique({
      where: { id: visitId, status: 'active' },
    });

    if (!existingVisit) {
      throw new NotFoundException('Visit not found');
    }

    // Deactivate all visit services for this visit
    await this.visitServiceService.deactivateVisitServices(visitId, prisma);

    // Deactivate the visit
    const deactivatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: { status: 'inactive' },
    });

    return deactivatedVisit;
  }

  // Helper method to fill missing dates with zero values
  private fillMissingDates(
    data: Array<{ date: string; visits: number; revenue: number }>,
    startDate: Date,
    endDate: Date,
  ) {
    const result = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = data.find((item) => item.date === dateStr);

      result.push({
        date: dateStr,
        visits: existingData?.visits || 0,
        revenue: existingData?.revenue || 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  async getUserRecentVisits(userId: string, prisma: Prisma.TransactionClient) {
    try {
      const visits = await prisma.visit.findMany({
        where: {
          userId,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          barberShop: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          visitServices: {
            include: {
              service: {
                select: {
                  id: true,
                  serviceName: true,
                  estimatedTime: true,
                },
              },
            },
          },
        },
      });

      return visits;
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Error fetching user recent visits',
        error: error?.message || error,
      });
    }
  }

  async getCustomerDashboard(userId: string, prisma: Prisma.TransactionClient) {
    // Verify user exists and is a customer
    const user = await prisma.user.findUnique({
      where: { id: userId, role: 'customer' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        message: 'User not found or not a customer',
        error: 'User does not exist or invalid role',
      });
    }

    // Use dedicated helper methods
    const [recentVisits, currentQueues] = await Promise.all([
      this.getUserRecentVisits(userId, prisma),
      this.shopQueueService.getUserCurrentQueues(userId, prisma),
    ]);

    return {
      user,
      recentVisits,
      currentQueues,
    };
  }

  async updateStateAndCreateVisit(
    userId: string,
    dto: any,
    prisma: Prisma.TransactionClient,
  ) {
    const { queueId, state } = dto;
    console.log('state-->>', state);

    if (state != (QueueState.SERVED as string)) {
      throw new BadRequestException({
        message:
          'Invalid state update. State must be SERVED to create a visit.',
        error: 'Invalid state transition',
      });
    }

    const updatedQueue = await this.shopQueueService.updateQueueState(
      {
        queueId,
        state: state,
      },
      prisma,
    );

    const payload: CreateVisitDto = {
      barberShopId: updatedQueue.barberShopId,
      shopQueueId: updatedQueue.id,
      services: dto.services,
      totalAmount: dto.totalAmount,
      customerInfo: dto.customerInfo,
    };

    const newVisit = await this.createVisit(payload, userId, prisma);

    return {
      updatedQueue,
      newVisit,
    };
  }
}
