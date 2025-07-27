import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';
import { Response } from 'express'; // ✅ Import Response type from express

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() user: User,
    @Res({ passthrough: true }) res: Response, // ✅ Removed extra paren
  ) {
    console.log('user-->>', user);

    const { user: createdUser, token } = await this.authService.register(user); // ✅ Await and rename to avoid shadowing

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return createdUser;
  }

  @Post('login')
  async login(
    @Body() userDetails: Record<string, any>,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('userDetails-->>', userDetails);

    const { user, token } = await this.authService.login(userDetails);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return user;
  }
}
