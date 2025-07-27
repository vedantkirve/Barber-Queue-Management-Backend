import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

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
