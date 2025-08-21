import { z } from 'zod';

export const UpdateShopSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  address: z.string().optional(),
});

export type UpdateShopDto = z.infer<typeof UpdateShopSchema>;
