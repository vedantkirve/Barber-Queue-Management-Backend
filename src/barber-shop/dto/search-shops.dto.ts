import { z } from 'zod';

export const SearchShopsQuerySchema = z.object({
  query: z.string().min(1, { message: 'Search query is required' }),
  page: z
    .number()
    .optional()
    .default(1)
    .refine((val) => val > 0, { message: 'Page must be greater than 0' }),
  limit: z
    .number()
    .optional()
    .default(10)
    .refine((val) => val > 0 && val <= 100, {
      message: 'Limit must be between 1 and 100',
    }),
});

export type SearchShopsQueryDto = z.infer<typeof SearchShopsQuerySchema>;
