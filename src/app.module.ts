import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServiceModule } from './service/service.module';
import { BarberShopModule } from './barber-shop/barber-shop.module';
import { VisitModule } from './visit/visit.module';
import { VisitServiceModule } from './visit-service/visit-service.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ServiceModule,
    BarberShopModule,
    VisitModule,
    VisitServiceModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
