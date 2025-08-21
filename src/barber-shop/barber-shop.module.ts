import { Module } from '@nestjs/common';
import { BarberShopController } from './barber-shop.controller';
import { BarberShopService } from './barber-shop.service';

@Module({
  controllers: [BarberShopController],
  providers: [BarberShopService],
  exports: [BarberShopService],
})
export class BarberShopModule {}
