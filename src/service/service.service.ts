import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarberShopService } from '../barber-shop/barber-shop.service';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barberShopService: BarberShopService, // Inject BarberShopService
  ) {}

  async createService(createServiceDto: any, userId: string) {
    try {
      const { barberShopId, serviceName, price, estimatedTime } =
        createServiceDto;

      // Use BarberShopService to verify ownership
      await this.barberShopService.verifyShopOwnership(barberShopId, userId);

      // Create the service
      const service = await this.prisma.service.create({
        data: {
          barberShopId,
          serviceName,
          price,
          estimatedTime,
          status: 'active',
        },
      });

      return service;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        message: 'Failed to create service',
        error: error?.message || error,
      });
    }
  }
}
