import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarberShopService } from '../barber-shop/barber-shop.service';
import { Visit } from '@prisma/client';

@Injectable()
export class VisitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barberShopService: BarberShopService,
  ) {}

  async createVisit(createVisitDto: any, userId: string, prisma: any) {
    const { barberShopId, services, totalAmount } = createVisitDto;

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

    // 3. Create the visit
    const visit: Visit = await prisma.visit.create({
      data: {
        userId: createVisitDto.userId || null, // Optional for walk-in customers
        barberShopId,
        totalAmount,
        status: 'completed',
      },
    });

    // 4. Create visit services
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
    };
  }
}
