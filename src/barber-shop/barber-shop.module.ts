import { Module } from '@nestjs/common';
import { BarberShopController } from './barber-shop.controller';
import { BarberShopService } from './barber-shop.service';
import { ShopQueueModule } from '../shop-queue/shop-queue.module';

@Module({
  imports: [ShopQueueModule],
  controllers: [BarberShopController],
  providers: [BarberShopService],
  exports: [BarberShopService],
})
export class BarberShopModule {}
