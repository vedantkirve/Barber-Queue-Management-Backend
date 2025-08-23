import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarberShopService } from '../barber-shop/barber-shop.service';
import { Prisma } from '@prisma/client';
import { SearchServicesQueryDto } from './dto/search-services-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateMultipleServicesDto } from './dto/create-multiple-services.dto';

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

  async createMultipleServices(
    createMultipleServicesDto: CreateMultipleServicesDto,
    userId: string,
    prisma: Prisma.TransactionClient,
  ) {
    const { barberShopId, services } = createMultipleServicesDto;

    // Verify shop ownership with transaction prisma
    await this.barberShopService.verifyShopOwnership(
      barberShopId,
      userId,
      prisma,
    );

    // Create all services in parallel
    const createdServices = await Promise.all(
      services.map(async (serviceData) => {
        return await prisma.service.create({
          data: {
            barberShopId,
            serviceName: serviceData.serviceName,
            price: serviceData.price,
            estimatedTime: serviceData.estimatedTime,
            status: 'active',
          },
        });
      }),
    );

    return createdServices;
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

    return {
      data: services || [],
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

  async updateService(
    updateServiceDto: UpdateServiceDto,
    userId: string,
    prisma: Prisma.TransactionClient,
  ) {
    const { id } = updateServiceDto;
    // First, find the service to get the barberShopId
    const existingService = await prisma.service.findUnique({
      where: { id: id },
      include: {
        barberShop: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!existingService) {
      throw new NotFoundException('Service not found');
    }

    // Verify shop ownership
    await this.barberShopService.verifyShopOwnership(
      existingService.barberShopId,
      userId,
      prisma,
    );

    // Update the service
    const updatedService = await prisma.service.update({
      where: { id: id },
      data: {
        ...(updateServiceDto.serviceName && {
          serviceName: updateServiceDto.serviceName,
        }),
        ...(updateServiceDto.price !== undefined && {
          price: updateServiceDto.price,
        }),
        ...(updateServiceDto.status && { status: updateServiceDto.status }),
        ...(updateServiceDto.estimatedTime && {
          estimatedTime: updateServiceDto.estimatedTime,
        }),
      },
      include: {
        barberShop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return updatedService;
  }
}
