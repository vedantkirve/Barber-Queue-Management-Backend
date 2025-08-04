import { Module } from '@nestjs/common';
import { VisitController } from './visit.controller';
import { VisitService } from './visit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BarberShopModule } from '../barber-shop/barber-shop.module';

@Module({
  imports: [PrismaModule, BarberShopModule],
  controllers: [VisitController],
  providers: [VisitService],
  exports: [VisitService],
})
export class VisitModule {}
