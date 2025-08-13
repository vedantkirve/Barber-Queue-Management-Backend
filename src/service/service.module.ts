import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { BarberShopModule } from '../barber-shop/barber-shop.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [BarberShopModule, PrismaModule],
  controllers: [ServiceController],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
