import {
  Controller,
  Post,
  Body,
  Request,
  BadRequestException,
  HttpException,
  UsePipes,
  Get,
  Query,
  Put,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitService } from './visit.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateVisitSchema, CreateVisitDto } from './dto/create-visit.dto';
import {
  GetVisitsQuerySchema,
  GetVisitsQueryDto,
} from './dto/get-visits-query.dto';
import {
  AnalyticsQuerySchema,
  AnalyticsQueryDto,
} from './dto/analytics-query.dto';
import { DeleteVisitSchema, DeleteVisitDto } from './dto/delete-visit.dto';
import { UserService } from 'src/user/user.service';

@Controller('visit')
export class VisitController {
  constructor(
    private readonly visitService: VisitService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create')
  @UsePipes(new ZodValidationPipe(CreateVisitSchema))
  async createVisit(
    @Body() createVisitDto: CreateVisitDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.visitService.createVisit(
          createVisitDto,
          userId,
          prisma,
        );
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Visit creation failed:', error);
      throw new BadRequestException({
        message: 'Failed to create visit',
        error: error,
      });
    }
  }

  @Get('search')
  @UsePipes(new ZodValidationPipe(GetVisitsQuerySchema))
  async getVisits(@Request() req: any, @Query() query: GetVisitsQueryDto) {
    try {
      const { barberShopId, userId, page, limit } = query;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.visitService.getVisitsByBarberShopOrUser(
          prisma,
          barberShopId,
          userId,
          page,
          limit,
        );
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Failed to fetch visits:', error);
      throw new BadRequestException({
        message: 'Failed to fetch visits',
        error: error,
      });
    }
  }

  @Post('analytics')
  @UsePipes(new ZodValidationPipe(AnalyticsQuerySchema))
  async getAnalytics(@Body() analyticsQueryDto: AnalyticsQueryDto) {
    try {
      const { startDate, endDate, barberShopId } = analyticsQueryDto;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.visitService.getAnalytics(
          prisma,
          startDate,
          endDate,
          barberShopId,
        );
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Failed to fetch analytics:', error);
      throw new BadRequestException({
        message: 'Failed to fetch analytics',
        error: error,
      });
    }
  }

  @Put('delete')
  @UsePipes(new ZodValidationPipe(DeleteVisitSchema))
  async deleteVisit(@Body() deleteVisitDto: DeleteVisitDto) {
    try {
      const { id } = deleteVisitDto;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.visitService.deleteVisit(id, prisma);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Failed to deactivate visit:', error);
      throw new BadRequestException({
        message: 'Failed to deactivate visit',
        error: error,
      });
    }
  }

  @Get('dashboard')
  @UsePipes()
  async getCustomerDashboard(@Request() req: any) {
    try {
      const userId = req.user?.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.visitService.getCustomerDashboard(userId, prisma);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Get customer dashboard failed:', error);
      throw new BadRequestException({
        message: 'Failed to get customer dashboard',
        error: 'Internal server error',
      });
    }
  }

  @Post('update-state-create-visit')
  async updateStateAndCreateVisit(@Body() body: any, @Request() req: any) {
    try {
      const userId = req.user?.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.visitService.updateStateAndCreateVisit(
          userId,
          body,
          prisma,
        );
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Failed to update state and create visit',
        error: 'Internal server error',
      });
    }
  }
}
