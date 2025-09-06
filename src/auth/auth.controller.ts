import { Body, Controller, Post, Get, Req, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';
import { Request } from 'express';
import { Public } from './decorators/is-public.decorator';
import { AuthStatusDto } from './dto/auth-status.dto';
import { LoginDto, LoginSchema } from './dto/login.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

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
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() userDetails: LoginDto) {
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
