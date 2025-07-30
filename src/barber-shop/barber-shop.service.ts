import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BarberShopService {
  constructor(private readonly prisma: PrismaService) {}

  async createShop(createShopDto: any, userId: string) {
    // TODO: Add proper DTO validation
    const { name, address, latitude, longitude, isOpen = true } = createShopDto;

    const barberShop = await this.prisma.barberShop.create({
      data: {
        userId,
        name,
        address,
        latitude,
        longitude,
        isOpen,
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

  async verifyShopOwnership(barberShopId: string, userId: string) {
    const barberShop = await this.prisma.barberShop.findFirst({
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
}
