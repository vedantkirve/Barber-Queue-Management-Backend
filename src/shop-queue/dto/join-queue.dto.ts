import { z } from 'zod';

export const JoinQueueSchema = z.object({
  barberShopId: z.string().uuid({
    message: 'Invalid barber shop ID format',
  }),
});

export type JoinQueueDto = z.infer<typeof JoinQueueSchema>;
