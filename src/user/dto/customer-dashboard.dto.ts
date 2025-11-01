import { z } from 'zod';

// DTO for customer dashboard response
export const CustomerDashboardResponseSchema = z.object({
  recentVisits: z.array(
    z.object({
      id: z.string(),
      barberShopId: z.string(),
      totalAmount: z.number(),
      status: z.string(),
      createdAt: z.date(),
      updatedAt: z.date(),
      barberShop: z.object({
        id: z.string(),
        name: z.string(),
        address: z.string(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
      }),
      visitServices: z.array(
        z.object({
          id: z.string(),
          chargedPrice: z.number(),
          status: z.string(),
          service: z.object({
            id: z.string(),
            serviceName: z.string(),
            estimatedTime: z.number(),
          }),
        }),
      ),
    }),
  ),
  currentQueues: z.array(
    z.object({
      id: z.string(),
      barberShopId: z.string(),
      state: z.enum(['in_queue', 'picked', 'served']),
      joinedAt: z.date(),
      servedAt: z.date().nullable(),
      barberShop: z.object({
        id: z.string(),
        name: z.string(),
        address: z.string(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        isOpen: z.boolean(),
      }),
      queuePosition: z.number().optional(),
      estimatedWaitTime: z.number().optional(), // in minutes
    }),
  ),
});

export type CustomerDashboardResponseDto = z.infer<
  typeof CustomerDashboardResponseSchema
>;

// Query DTO for filtering barber shops (optional)
export const CustomerDashboardQuerySchema = z.object({
  barberShopIds: z
    .string()
    .optional()
    .transform((str) => {
      if (!str) return undefined;
      // Handle comma-separated string and convert to array
      return str
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }),
});

export type CustomerDashboardQueryDto = {
  barberShopIds?: string[];
};
