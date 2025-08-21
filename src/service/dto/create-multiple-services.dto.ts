import { z } from 'zod';

export const CreateServiceSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),
  price: z.number().positive('Price must be positive'),
  estimatedTime: z.number().positive('Estimated time must be positive'),
});

export const CreateMultipleServicesSchema = z.object({
  barberShopId: z.string().uuid('Barber shop ID must be a valid UUID'),
  services: z
    .array(CreateServiceSchema)
    .min(1, 'At least one service is required')
    .max(50, 'Maximum 50 services can be created at once'),
});

export type CreateServiceDto = z.infer<typeof CreateServiceSchema>;
export type CreateMultipleServicesDto = z.infer<
  typeof CreateMultipleServicesSchema
>;
