import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { BarberShopModule } from '../barber-shop/barber-shop.module';

@Module({
  imports: [BarberShopModule], // Import BarberShopModule
  controllers: [ServiceController],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
