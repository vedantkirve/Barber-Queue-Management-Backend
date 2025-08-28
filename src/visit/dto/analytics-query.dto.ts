import { z } from 'zod';

export const AnalyticsQuerySchema = z
  .object({
    startDate: z.coerce.date('Start date must be a valid date'),
    endDate: z.coerce.date('End date must be a valid date'),
    barberShopId: z.string().uuid('Barber shop ID must be a valid UUID'),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['startDate', 'endDate'],
  });

export type AnalyticsQueryDto = z.infer<typeof AnalyticsQuerySchema>;
