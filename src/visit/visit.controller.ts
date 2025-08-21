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
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitService } from './visit.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateVisitSchema, CreateVisitDto } from './dto/create-visit.dto';
import {
  GetVisitsQuerySchema,
  GetVisitsQueryDto,
} from './dto/get-visits-query.dto';

@Controller('visit')
export class VisitController {
  constructor(
    private readonly visitService: VisitService,
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
}
