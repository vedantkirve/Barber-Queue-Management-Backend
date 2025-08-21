import { z } from 'zod';

export const GetVisitsQuerySchema = z
  .object({
    barberShopId: z
      .string()
      .uuid('Barber shop ID must be a valid UUID')
      .optional(),
    userId: z.string().uuid('User ID must be a valid UUID').optional(),
    page: z.coerce
      .number()
      .int()
      .positive('Page must be a positive integer')
      .default(1),
    limit: z.coerce
      .number()
      .int()
      .positive('Limit must be a positive integer')
      .min(1)
      .max(100)
      .default(10),
  })
  .refine((data) => data.barberShopId || data.userId, {
    message: 'At least one of barberShopId or userId must be provided',
    path: ['barberShopId', 'userId'],
  });

export type GetVisitsQueryDto = z.infer<typeof GetVisitsQuerySchema>;
