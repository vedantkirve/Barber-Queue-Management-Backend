import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarberShopService } from '../barber-shop/barber-shop.service';
import { UserService } from '../user/user.service';
import { Visit } from '@prisma/client';
import { CreateVisitDto } from './dto/create-visit.dto';

@Injectable()
export class VisitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barberShopService: BarberShopService,
    private readonly userService: UserService,
  ) {}

  async createVisit(
    createVisitDto: CreateVisitDto,
    userId: string,
    prisma: any,
  ) {
    const { barberShopId, services, totalAmount, customerInfo } =
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

    // 3. Handle user creation for unregistered customers
    let visitUserId = customerInfo?.userId || null;

    if (!visitUserId && customerInfo) {
      // Create new user for walk-in customer using UserService
      const newUser = await this.userService.createUnregisteredUser(
        customerInfo,
        prisma,
      );
      visitUserId = newUser.id;
    }

    // 4. Create the visit
    const visit: Visit = await prisma.visit.create({
      data: {
        userId: visitUserId,
        barberShopId,
        totalAmount,
        status: 'completed',
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

    const whereClause: any = {};

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
}
