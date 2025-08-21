import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarberShop, Prisma } from '@prisma/client';
import { UpdateShopDto } from './dto/update-shop.dto';

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

  async updateShop(
    shopId: string,
    userId: string,
    updateData: UpdateShopDto,
    prisma: any,
  ) {
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
      data: updateData,
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
}
