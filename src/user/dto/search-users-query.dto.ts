import { z } from 'zod';

export const SearchUsersQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(['firstName', 'lastName', 'email', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SearchUsersQueryDto = z.infer<typeof SearchUsersQuerySchema>;
