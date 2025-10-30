import { Injectable, Logger } from '@nestjs/common';
import webPush from 'web-push';

type PushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // Hardcoded mock subscription (replace with real client subscription when available)
  private readonly mockSubscription: PushSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/dummy-endpoint',
    keys: {
      p256dh: 'BMOCK_p256dh_key_replace_with_real_one',
      auth: 'MOCK_auth_key',
    },
  };

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY || '';
    const mailto = process.env.VAPID_MAILTO || 'mailto:admin@example.com';

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

  async sendNotification() {
    const payload = JSON.stringify({
      title: 'BarberOps Notification',
      body: 'Your appointment is confirmed. See details inside.',
      icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991108.png',
      url: 'https://example.com/visits',
    });

    try {
      const result = await webPush.sendNotification(
        this.mockSubscription,
        payload,
      );
      this.logger.log(`Push sent: status ${result.statusCode}`);
      return { success: true } as const;
    } catch (error) {
      this.logger.error('Error sending push notification', error as Error);
      return { success: false, error: (error as Error).message } as const;
    }
  }
}
