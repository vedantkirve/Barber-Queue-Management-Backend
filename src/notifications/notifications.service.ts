import { Injectable, Logger } from '@nestjs/common';
import * as webPush from 'web-push';
import type { Prisma } from '@prisma/client';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY || '';
    const mailto = process.env.VAPID_MAILTO || 'mailto:admin@example.com';

    console.log('publicKey-->>', publicKey);
    console.log('privateKey-->>', privateKey);
    console.log('mailto-->>', mailto);

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys are not set. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your environment to enable push notifications.',
      );
    }

    try {
      webPush.setVapidDetails(mailto, publicKey, privateKey);
    } catch (err) {
      this.logger.error(
        'Failed to configure web-push VAPID details',
        err as Error,
      );
    }
  }

  // Create or reactivate a subscription for a user
  async subscribe(
    userId: string,
    dto: CreateSubscriptionDto,
    prisma: Prisma.TransactionClient,
  ) {
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
    });

    if (existing) {
      if (existing.status !== 'ACTIVE') {
        return prisma.pushSubscription.update({
          where: { endpoint: dto.endpoint },
          data: { status: 'ACTIVE', userId },
        });
      }
      return existing;
    }

    return prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: dto.endpoint,
        keysAuth: dto.keys.auth,
        keysP256dh: dto.keys.p256dh,
        status: 'ACTIVE',
      },
    });
  }

  // Mark subscription as INACTIVE by endpoint
  async unsubscribe(endpoint: string, prisma: Prisma.TransactionClient) {
    return prisma.pushSubscription.update({
      where: { endpoint },
      data: { status: 'INACTIVE' },
    });
  }

  // Send a notification to all ACTIVE subscriptions of a user
  async sendNotification(
    dto: SendNotificationDto,
    prisma: Prisma.TransactionClient,
  ) {
    const { userId, title, message, url } = dto;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    if (subscriptions.length === 0) {
      this.logger.warn(`No active subscriptions for user ${userId}`);
      return { success: true, sent: 0, failed: 0 } as const;
    }

    // ✅ CRITICAL: Payload must be a JSON STRING, not an object
    const payload = JSON.stringify({
      title: title || 'BarberOps Notification',
      body: message || 'You have a new notification',
      icon: '/logo192.png',
      url: url || '/',
    });

    console.log('📦 Payload being sent:', payload);

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.keysAuth,
            p256dh: sub.keysP256dh,
          },
        };

        console.log(`📤 Sending push to: ${sub.endpoint.substring(0, 50)}...`);
        console.log(`📦 With payload:`, payload);

        // ✅ Send the stringified payload
        const result = await webPush.sendNotification(
          pushSubscription,
          payload,
        );

        console.log(
          `✅ Push sent! Status: ${result.statusCode}, Body:`,
          result.body,
        );
        sent += 1;
      } catch (err: any) {
        failed += 1;

        console.error(`❌ Push failed for ${sub.endpoint.substring(0, 50)}...`);
        console.error(`Status: ${err.statusCode}`);
        console.error(`Message: ${err.message}`);
        console.error(`Body:`, err.body);

        // Mark as inactive on permanent failures
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { status: 'INACTIVE' },
          });
        }
      }
    }

    return { success: true, sent, failed } as const;
  }
}
