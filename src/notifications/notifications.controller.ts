import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import {
  CreateSubscriptionSchema,
  CreateSubscriptionDto,
} from './dto/create-subscription.dto';
import {
  SendNotificationSchema,
  SendNotificationDto,
} from './dto/send-notification.dto';
import { z } from 'zod';
import { Public } from 'src/auth/decorators/is-public.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('subscribe')
  async subscribe(
    @Req() req: any,
    @Body(new ZodValidationPipe(CreateSubscriptionSchema))
    dto: CreateSubscriptionDto,
  ) {
    const userId = req.user?.userId;
    console.log('userId->>', userId);
    return this.prisma.$transaction(async (prisma) => {
      return this.notificationsService.subscribe(userId, dto, prisma);
    });
  }

  @Post('unsubscribe')
  async unsubscribe(
    @Body(new ZodValidationPipe(z.object({ endpoint: z.string().url() })))
    body: {
      endpoint: string;
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      return this.notificationsService.unsubscribe(body.endpoint, prisma);
    });
  }

  @Public()
  @Post('send')
  async send(
    @Body(new ZodValidationPipe(SendNotificationSchema))
    dto: SendNotificationDto,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      return this.notificationsService.sendNotification(dto, prisma);
    });
  }

  @Public()
  @Get('vapid-key')
  getVapidKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY };
  }
}
