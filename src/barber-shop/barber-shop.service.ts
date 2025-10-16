import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarberShop, Prisma } from '@prisma/client';
import { UpdateShopDto } from './dto/update-shop.dto';
import { QueueState } from '../common/enums/queue-state.enum';
import { GetAllShopsQueryDto } from './dto/get-all-shops.dto';

@Injectable()
export class BarberShopService {
  constructor(private readonly prisma: PrismaService) {}

  async createShop(createShopDto: any, userId: string) {
    const { name, address, latitude, longitude, isOpen = true } = createShopDto;

    const barberShop = await this.prisma.barberShop.create({
      data: {
        userId,
        name,
        address,
        latitude,
        longitude,
        isOpen,
        status: 'active',
      },
    });

    return barberShop;
  }

  async getShopByUserId(userId: string) {
    const barberShop = await this.prisma.barberShop.findFirst({
      where: {
        userId,
        status: 'active',
      },
    });

    if (!barberShop) {
      throw new NotFoundException('Barber shop not found for this user');
    }

    return barberShop;
  }

  // New function to get shop with services
  async getShop(barberShopId: string, prisma: any) {
    const barberShop = await prisma.barberShop.findUnique({
      where: {
        id: barberShopId,
        status: 'active',
      },
      include: {
        services: {
          where: { status: 'active' },
        },
      },
    });

    if (!barberShop) {
      throw new NotFoundException('Barber shop not found');
    }

    return barberShop;
  }

  // Get shop details with services for public view
  async getShopDetails(barberShopId: string, prisma: any) {
    const barberShop = await prisma.barberShop.findUnique({
      where: {
        id: barberShopId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        isOpen: true,
        createdAt: true,
        updatedAt: true,
        services: {
          where: { status: 'active' },
          select: {
            id: true,
            serviceName: true,
            price: true,
            estimatedTime: true,
            createdAt: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
        shopQueues: {
          where: {
            state: QueueState.IN_QUEUE,
            status: 'active',
          },
        },
        _count: {
          select: {
            visits: true,
          },
        },
      },
    });

    if (!barberShop) {
      throw new NotFoundException('Barber shop not found');
    }

    return barberShop;
  }

  // Updated to always require prisma instance
  async verifyShopOwnership(
    barberShopId: string,
    userId: string,
    prisma: Prisma.TransactionClient,
  ): Promise<BarberShop | null> {
    const barberShop = await prisma.barberShop.findFirst({
      where: {
        id: barberShopId,
        userId: userId,
        status: 'active',
      },
    });

    if (!barberShop) {
      throw new NotFoundException(
        'Barber shop not found or you do not have permission to access this shop',
      );
    }

    return barberShop;
  }

  // Get all shops related to a user ID
  async getAllShopsByUserId(userId: string, prisma: any) {
    const shops = await prisma.barberShop.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        services: {
          where: { status: 'active' },
          select: {
            id: true,
            serviceName: true,
            price: true,
            estimatedTime: true,
          },
        },
        _count: {
          select: {
            visits: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return shops;
  }

  async updateShop(userId: string, updateData: UpdateShopDto, prisma: any) {
    const { id: shopId, ...updateFields } = updateData;
    // Verify shop ownership
    const existingShop = await this.verifyShopOwnership(shopId, userId, prisma);

    if (!existingShop) {
      throw new NotFoundException(
        'Barber shop not found or you do not have permission to update this shop',
      );
    }

    // Update shop details
    const updatedShop = await prisma.barberShop.update({
      where: { id: shopId },
      data: updateFields,
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        isOpen: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedShop;
  }

  // Get all shops with optional search and pagination
  async getAllShops(dto: GetAllShopsQueryDto, prisma: any) {
    console.log('dto-->>', dto);

    const { page = 1, limit = 10, query, queue_info = false } = dto;
    const skip = (page - 1) * limit;

    // Build where clause - only add search if query exists
    const whereClause: any = {
      status: 'active',
    };

    // Only add search conditions if query is provided and not empty
    if (query && query.trim()) {
      whereClause.OR = [
        {
          name: {
            contains: query,
            mode: 'insensitive' as any,
          },
        },
        {
          address: {
            contains: query,
            mode: 'insensitive' as any,
          },
        },
      ];
    }

    // Build select clause - conditionally include queue info
    const selectClause: any = {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      isOpen: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          services: {
            where: { status: 'active' },
          },
          visits: true,
        },
      },
    };

    // Add queue count if queue_info is true
    if (queue_info) {
      selectClause._count.select.shopQueues = {
        where: {
          state: QueueState.IN_QUEUE,
          status: 'active',
        },
      };
    }

    const [shops, total] = await Promise.all([
      prisma.barberShop.findMany({
        where: whereClause,
        select: selectClause,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.barberShop.count({
        where: whereClause,
      }),
    ]);

    return {
      data: shops,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
