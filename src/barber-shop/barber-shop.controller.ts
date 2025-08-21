import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  Put,
  Param,
  BadRequestException,
  HttpException,
  UsePipes,
} from '@nestjs/common';
import { BarberShopService } from './barber-shop.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UpdateShopSchema, UpdateShopDto } from './dto/update-shop.dto';

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

  @Put(':shopId')
  @UsePipes(new ZodValidationPipe(UpdateShopSchema))
  async updateShop(
    @Param('shopId') shopId: string,
    @Body() updateData: UpdateShopDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId;

      return await this.prismaService.$transaction(async (prisma) => {
        return await this.barberShopService.updateShop(
          shopId,
          userId,
          updateData,
          prisma,
        );
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Update shop failed:', error);
      throw new BadRequestException({
        message: 'Failed to update shop',
        error: 'Internal server error',
      });
    }
  }
}
