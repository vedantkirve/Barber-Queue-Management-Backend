import { z } from 'zod';

export const SearchServicesQuerySchema = z.object({
  barberShopId: z.string().uuid('Barber shop ID must be a valid UUID'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
  sortBy: z.enum(['name', 'price', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SearchServicesQueryDto = z.infer<typeof SearchServicesQuerySchema>;
