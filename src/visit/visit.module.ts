import { Module } from '@nestjs/common';
import { VisitController } from './visit.controller';
import { VisitService } from './visit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BarberShopModule } from '../barber-shop/barber-shop.module';
import { UserModule } from '../user/user.module';
import { VisitServiceModule } from '../visit-service/visit-service.module';

@Module({
  imports: [PrismaModule, BarberShopModule, UserModule, VisitServiceModule],
  controllers: [VisitController],
  providers: [VisitService],
  exports: [VisitService],
})
export class VisitModule {}
