import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthStatusDto } from './dto/auth-status.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(emailOrPhone: string, password: string): Promise<any> {
    const users = await this.userService.findUserByEmailOrPhone(
      emailOrPhone,
      this.prisma,
    );

    // Check password for each user
    for (const user of users) {
      if (user.password) {
        const isMatch = await this.comparePasswords(password, user.password);
        if (isMatch) {
          console.log(`✅ Password match found for user: ${user.email}`);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password, ...result } = user;
          return result;
        }
      }
    }

    // If any matching account exists without a password set, guide client to set one
    const hasAccountWithoutPassword = users.some((u) => !u.password);
    if (hasAccountWithoutPassword) {
      throw new UnauthorizedException(
        'Account exists without password. Please set your password to continue.',
      );
    }

    throw new UnauthorizedException('Invalid email/phone or password');
  }

  async login(userDetails: any) {
    const { password, emailOrPhone } = userDetails;
    const user = await this.validateUser(emailOrPhone, password);

    const token = this.generateToken({ userId: user.id });

    return { user, token };
  }

  async register(user: User) {
    // Basic guard: password is required for registration or completing account
    if (!user?.password || user.password.trim() === '') {
      throw new BadRequestException('Password is required');
    }

    // Check if user already exists with the same phone number
    if (user.phoneNumber) {
      const existingUser = await this.userService.findOne({
        phoneNumber: user.phoneNumber,
      });

      if (existingUser) {
        // If the existing account was pre-created without a password,
        // do NOT set the password here. Instead, return a structured
        // response that tells the client to call the separate
        // "set-password" endpoint to complete account setup.
        if (!existingUser.password) {
          return {
            needsPasswordSetup: true,
            message:
              'Account exists without password. Please set your password to continue.',
            user: {
              id: existingUser.id,
              phoneNumber: existingUser.phoneNumber,
              email: existingUser.email,
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
            },
          };
        }

        // Otherwise, a fully registered account already exists
        throw new BadRequestException(
          'User already exists with the same phone number',
        );
      }
    }

    // No existing user with this phone number; create a fresh user
    const hashedPassword = await this.hashPassword(user.password);

    const createdUser = await this.userService.createUser({
      ...user,
      password: hashedPassword,
    });

    const token = this.generateToken({ userId: createdUser.id });

    return { user: createdUser, token };
  }

  /**
   * Complete account setup for users who were pre-created without a password.
   * Only allowed when the existing user has no password set.
   */
  async setPassword(payload: SetPasswordDto) {
    const { phoneNumber, id, password, firstName, lastName, email } = payload;

    if (!password || password.trim() === '') {
      throw new BadRequestException('Password is required');
    }

    // Find user by provided identifier
    const existingUser = await this.userService.findOne({
      phoneNumber,
      id,
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.password) {
      throw new BadRequestException('User already has a password');
    }

    const hashedPassword = await this.hashPassword(password);

    const updatedUser = await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        firstName: firstName ?? existingUser.firstName,
        lastName: lastName ?? existingUser.lastName,
        email: email ?? existingUser.email,
      },
    });

    const token = this.generateToken({ userId: updatedUser.id });
    return { user: updatedUser, token };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      return { isValid: true, payload, isExpired: false };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { isValid: false, payload: null, isExpired: true };
      }
      return { isValid: false, payload: null, isExpired: false };
    }
  }

  async getAuthStatus(req: any): Promise<AuthStatusDto> {
    // Extract token from cookies or headers
    const token = req?.cookies?.access_token || req?.headers?.token;

    if (!token) {
      return {
        isAuthenticated: false,
      };
    }

    // Validate token
    const tokenValidation = await this.validateToken(token);

    if (!tokenValidation.isValid) {
      return {
        isAuthenticated: false,
      };
    }

    // Token is valid, get user info
    const user: User = await this.userService.findOne({
      id: tokenValidation.payload.userId,
    });

    if (!user) {
      return {
        isAuthenticated: false,
      };
    }

    // Exclude password and other sensitive fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;

    return {
      isAuthenticated: true,
      user: safeUser,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { currentPassword, newPassword } = dto;

    const user = await this.userService.findOne({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException('User has no password set');
    }

    const isMatch = await this.comparePasswords(currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await this.comparePasswords(
      newPassword,
      user.password,
    );

    if (isSamePassword)
      throw new BadRequestException(
        'New password cannot be the same as the current password',
      );

    const hashedPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePasswords(raw: string, hash: string): Promise<boolean> {
    return bcrypt.compare(raw, hash);
  }

  private generateToken(payload: any): string {
    return this.jwtService.sign(payload, { expiresIn: '1d' });
  }
}
