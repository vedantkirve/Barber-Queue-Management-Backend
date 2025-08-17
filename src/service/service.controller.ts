import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  Query,
  BadRequestException,
  HttpException,
  UsePipes,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  SearchServicesQuerySchema,
  SearchServicesQueryDto,
} from './dto/search-services-query.dto';

@Controller('service')
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create')
  async createService(@Body() createServiceDto: any, @Request() req: any) {
    try {
      const userId = req.user.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.serviceService.createService(
          createServiceDto,
          userId,
          prisma,
        );
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Service creation failed:', error);
      throw new BadRequestException({
        message: 'Failed to create service',
        error: 'Internal server error',
      });
    }
  }

  @Get('search')
  @UsePipes(new ZodValidationPipe(SearchServicesQuerySchema))
  async searchServices(
    @Query() query: SearchServicesQueryDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.serviceService.searchServices(query, userId, prisma);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Service search failed:', error);
      throw new BadRequestException({
        message: 'Failed to search services',
        error: 'Internal server error',
      });
    }
  }
}
