import { Controller, Post, Get, Body, Request } from '@nestjs/common';
import { BarberShopService } from './barber-shop.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('barber-shop')
export class BarberShopController {
  constructor(
    private readonly barberShopService: BarberShopService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post('create')
  async createShop(@Body() createShopDto: any, @Request() req: any) {
    // TODO: Add proper DTO validation
    const userId = req.user.userId;
    return this.barberShopService.createShop(createShopDto, userId);
  }

  @Get('my-shop')
  async getMyShop(@Request() req: any) {
    const userId = req.user.userId;
    return this.barberShopService.getShopByUserId(userId);
  }

  @Get('my-shops')
  async getMyShops(@Request() req: any) {
    const userId = req.user.userId;

    return await this.prismaService.$transaction(async (prisma) => {
      return this.barberShopService.getAllShopsByUserId(userId, prisma);
    });
  }
}
