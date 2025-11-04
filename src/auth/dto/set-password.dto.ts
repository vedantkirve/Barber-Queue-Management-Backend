import { z } from 'zod';

// Require user id and password; allow optional profile updates
export const SetPasswordSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
  password: z.string().min(1, 'Password is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Email must be valid').optional(),
  phoneNumber: z.string().optional(),
});

export type SetPasswordDto = z.infer<typeof SetPasswordSchema>;
