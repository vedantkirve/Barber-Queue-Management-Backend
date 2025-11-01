import { z } from 'zod';

export const SendNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1),
  message: z.string().min(1),
  url: z.string().url().optional(),
});

export type SendNotificationDto = z.infer<typeof SendNotificationSchema>;
