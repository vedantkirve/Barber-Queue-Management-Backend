import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/is-public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async health(@Query('deep') deep?: string) {
    // By default, do not hit the DB; report last-known status from PrismaService
    if (deep !== '1') {
      const db = this.prisma.isConnected ? 'connected' : 'disconnected';
      return { status: 'ok', db, mode: 'cached' };
    }

    // Optional deep probe that actually pings the DB
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'connected', mode: 'deep' };
    } catch (e: any) {
      return {
        status: 'ok',
        db: 'disconnected',
        mode: 'deep',
        error: e?.message,
      };
    }
  }
}
