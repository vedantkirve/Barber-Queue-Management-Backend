import { z } from 'zod';

export const UpdateServiceSchema = z.object({
  id: z.string().uuid('Service ID must be a valid UUID'),
  serviceName: z.string().optional(),
  price: z.number().positive('Price must be positive').optional(),
  status: z.enum(['active', 'inactive']).optional(),
  estimatedTime: z
    .number()
    .positive('Estimated time must be positive')
    .optional(),
});

export type UpdateServiceDto = z.infer<typeof UpdateServiceSchema>;
