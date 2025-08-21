import { z } from 'zod';

export const UpdateUserProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export type UpdateUserProfileDto = z.infer<typeof UpdateUserProfileSchema>;
