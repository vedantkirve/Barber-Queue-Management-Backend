import {
  Controller,
  Post,
  Body,
  Request,
  HttpException,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { JoinQueueDto, JoinQueueSchema } from './dto/join-queue.dto';
import { ShopQueueService } from './shop-queue.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

@Controller('shop-queue')
export class ShopQueueController {
  constructor(
    private readonly shopQueueService: ShopQueueService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('join')
  @UsePipes(new ZodValidationPipe(JoinQueueSchema))
  async joinQueue(@Body() dto: JoinQueueDto, @Request() req: any) {
    try {
      const userId = req.user?.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.shopQueueService.joinQueue(userId, dto, prisma);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Join queue failed:', error);
      throw new BadRequestException({
        message: 'Failed to join queue',
        error: 'Internal server error',
      });
    }
  }
}
