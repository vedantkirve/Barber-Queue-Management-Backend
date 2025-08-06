import {
  Controller,
  Post,
  Body,
  Request,
  BadRequestException,
  HttpException,
  UsePipes,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitService } from './visit.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateVisitSchema, CreateVisitDto } from './dto/create-visit.dto';

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
}
