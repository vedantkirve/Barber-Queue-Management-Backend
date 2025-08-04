import {
  Controller,
  Post,
  Body,
  Request,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitService } from './visit.service';

@Controller('visit')
export class VisitController {
  constructor(
    private readonly visitService: VisitService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create')
  async createVisit(@Body() createVisitDto: any, @Request() req: any) {
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
}
