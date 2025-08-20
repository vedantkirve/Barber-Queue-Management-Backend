import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthStatusDto } from './dto/auth-status.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findOne({ email });
    const isMatch = await this.comparePasswords(password, user?.password || '');

    if (user && isMatch) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } else {
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  async login(userDetails: any) {
    const { password, email } = userDetails;
    const user = await this.validateUser(email, password);

    const token = this.generateToken({ userId: user.id });

    return { user, token };
  }

  async register(user: User) {
    const hashedPassword = await this.hashPassword(user.password);
    console.log('hashedPassword-->>', hashedPassword);

    const createdUser = await this.userService.createUser({
      ...user,
      password: hashedPassword,
    });

    const token = this.generateToken({ userId: createdUser.id });

    return { user: createdUser, token: token };
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
    const { password, ...safeUser } = user;

    return {
      isAuthenticated: true,
      user: safeUser,
    };
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
