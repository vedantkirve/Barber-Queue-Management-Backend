import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShopQueueService } from './shop-queue.service';
import { ShopQueueController } from './shop-queue.controller';

@Module({
  imports: [PrismaModule, UserModule, NotificationsModule],
  controllers: [ShopQueueController],
  providers: [ShopQueueService],
  exports: [ShopQueueService],
})
export class ShopQueueModule {}
