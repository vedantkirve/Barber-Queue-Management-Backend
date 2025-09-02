import { Body, Controller, Post, Res, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';
import { Response, Request } from 'express'; // ✅ Import Response type from express
import { Public } from './decorators/is-public.decorator';
import { AuthStatusDto } from './dto/auth-status.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() user: User) {
    console.log('user-->>', user);

    const { user: createdUser, token } = await this.authService.register(user);

    return { ...createdUser, token };
  }

  @Public()
  @Post('login')
  async login(@Body() userDetails: Record<string, any>) {
    console.log('userDetails-->>', userDetails);

    const { user, token } = await this.authService.login(userDetails);

    return { ...user, token };
  }

  @Public()
  @Get('validate')
  async validateAuth(@Req() req: Request): Promise<AuthStatusDto> {
    return this.authService.getAuthStatus(req);
  }

  @Post('logout')
  async logout() {
    return { message: 'Logged out successfully' };
  }
}
