import { Body, Controller, Post, Get, Req, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';
import { Request } from 'express';
import { Public } from './decorators/is-public.decorator';
import { AuthStatusDto } from './dto/auth-status.dto';
import { LoginDto, LoginSchema } from './dto/login.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SetPasswordDto, SetPasswordSchema } from './dto/set-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() user: User) {
    console.log('user-->>', user);

    const result = await this.authService.register(user);

    // If the service indicates password setup is required, forward that
    if ((result as any).needsPasswordSetup) {
      return result;
    }

    const { user: createdUser, token } = result;
    return { ...createdUser, token };
  }

  @Public()
  @Post('set-password')
  @UsePipes(new ZodValidationPipe(SetPasswordSchema))
  async setPassword(@Body() payload: SetPasswordDto) {
    const { user, token } = await this.authService.setPassword(payload);
    return { ...user, token };
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
