import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServiceModule } from './service/service.module';
import { BarberShopModule } from './barber-shop/barber-shop.module';

@Module({
  imports: [PrismaModule, AuthModule, ServiceModule, BarberShopModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
