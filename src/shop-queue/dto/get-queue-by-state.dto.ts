import { z } from 'zod';
import { QueueState } from '../../common/enums/queue-state.enum';

export const GetQueueByStateSchema = z.object({
  barberShopId: z.string().uuid({
    message: 'Invalid barber shop ID format',
  }),
  state: z.nativeEnum(QueueState).default(QueueState.IN_QUEUE),
  page: z.number().optional().default(1),
  limit: z
    .number()
    .optional()
    .default(10)
    .refine((val) => val > 0 && val <= 100, {
      message: 'Limit must be between 1 and 100',
    }),
});

export type GetQueueByStateDto = z.infer<typeof GetQueueByStateSchema>;
