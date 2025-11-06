import { z } from 'zod';

export const CreateSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;
