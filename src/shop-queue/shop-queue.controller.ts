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
import {
  GetMyQueueStatusDto,
  GetMyQueueStatusSchema,
} from './dto/get-my-queue-status.dto';
import {
  GetQueueByStateDto,
  GetQueueByStateSchema,
} from './dto/get-queue-by-state.dto';
import { ShopQueueService } from './shop-queue.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Public } from '../auth/decorators/is-public.decorator';
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

  @Post('my-status')
  @UsePipes(new ZodValidationPipe(GetMyQueueStatusSchema))
  async getMyQueueStatus(
    @Body() dto: GetMyQueueStatusDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new BadRequestException({
          message: 'User not authenticated',
          error: 'Missing user ID',
        });
      }

      return await this.prisma.$transaction(async (prisma) => {
        return await this.shopQueueService.getMyQueueStatus(
          userId,
          dto,
          prisma,
        );
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Get queue status failed:', error);
      throw new BadRequestException({
        message: 'Failed to get queue status',
        error: 'Internal server error',
      });
    }
  }

  @Public()
  @Post('state')
  @UsePipes(new ZodValidationPipe(GetQueueByStateSchema))
  async getQueueByState(@Body() dto: GetQueueByStateDto) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        return await this.shopQueueService.getQueueByState(dto, prisma);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Get queue by state failed:', error);
      throw new BadRequestException({
        message: 'Failed to get queue by state',
        error: 'Internal server error',
      });
    }
  }
}
