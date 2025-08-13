import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarberShopService } from '../barber-shop/barber-shop.service';
import { Prisma } from '@prisma/client';
import { SearchServicesQueryDto } from './dto/search-services-query.dto';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barberShopService: BarberShopService,
  ) {}

  async createService(
    createServiceDto: any,
    userId: string,
    prisma: Prisma.TransactionClient,
  ) {
    const { barberShopId, serviceName, price, estimatedTime } =
      createServiceDto;

    // Verify shop ownership with transaction prisma
    await this.barberShopService.verifyShopOwnership(
      barberShopId,
      userId,
      prisma,
    );

    // Create the service with transaction prisma
    const service = await prisma.service.create({
      data: {
        barberShopId,
        serviceName,
        price,
        estimatedTime,
        status: 'active',
      },
    });

    return service;
  }

  async searchServices(
    query: SearchServicesQueryDto,
    userId: string,
    prisma: Prisma.TransactionClient,
  ) {
    const { barberShopId, status, page, limit, sortBy, sortOrder } = query;

    // Verify shop ownership
    await this.barberShopService.verifyShopOwnership(
      barberShopId,
      userId,
      prisma,
    );

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where: {
          barberShopId,
          status,
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          barberShop: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      }),
      prisma.service.count({
        where: {
          barberShopId,
          status,
        },
      }),
    ]);

    if (!services || services.length === 0) {
      throw new NotFoundException('No services found for this barber shop');
    }

    return {
      data: services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: {
        barberShopId,
        status,
        sortBy,
        sortOrder,
      },
    };
  }
}
