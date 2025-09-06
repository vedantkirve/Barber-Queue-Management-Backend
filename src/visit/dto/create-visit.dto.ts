import { z } from 'zod';

export const ServiceSchema = z.object({
  serviceId: z.string().uuid('Service ID must be a valid UUID'),
  chargedPrice: z.number().positive('Charged price must be a positive number'),
  notes: z.string().optional(),
});

export const CustomerInfoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  phoneNumber: z.string().optional(),
  userId: z.string().uuid('User ID must be a valid UUID').optional(),
});

export const CreateVisitSchema = z.object({
  barberShopId: z.string().uuid('Barber shop ID must be a valid UUID'),
  totalAmount: z.number().positive('Total amount must be a positive number'),
  customerInfo: CustomerInfoSchema,
  services: z.array(ServiceSchema).min(1, 'At least one service is required'),
});

export type CreateVisitDto = z.infer<typeof CreateVisitSchema>;
