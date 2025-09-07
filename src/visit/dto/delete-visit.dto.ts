import { z } from 'zod';

export const DeleteVisitSchema = z.object({
  id: z.string().uuid('Visit ID must be a valid UUID'),
});

export type DeleteVisitDto = z.infer<typeof DeleteVisitSchema>;
