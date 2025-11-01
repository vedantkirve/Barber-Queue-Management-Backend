import { z } from 'zod';

export const GetMyQueueStatusSchema = z.object({
  barberShopId: z.string().uuid({
    message: 'Invalid barber shop ID format',
  }),
});

export type GetMyQueueStatusDto = z.infer<typeof GetMyQueueStatusSchema>;
