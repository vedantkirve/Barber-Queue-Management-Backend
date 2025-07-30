import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarberShopService } from '../barber-shop/barber-shop.service';
import { Prisma } from '@prisma/client';
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
}
