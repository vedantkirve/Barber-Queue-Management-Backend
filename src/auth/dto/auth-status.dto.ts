import { User } from '@prisma/client';

// Create a safe user type that excludes sensitive fields
export type SafeUser = Omit<User, 'password'>;

export class AuthStatusDto {
  isAuthenticated: boolean;
  user?: SafeUser;
}
