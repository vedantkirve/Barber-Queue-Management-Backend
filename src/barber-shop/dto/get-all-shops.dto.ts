import { z } from 'zod';

export const GetAllShopsQuerySchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
  query: z.string().optional(),
  queue_info: z.boolean().optional().default(false), // Include queue count info
});

export type GetAllShopsQueryDto = z.infer<typeof GetAllShopsQuerySchema>;
