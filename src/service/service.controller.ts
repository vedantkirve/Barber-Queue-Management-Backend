import {
  Controller,
  Post,
  Body,
  Request,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { PrismaService } from '../prisma/prisma.service';

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
      // Handle specific exceptions
      if (error instanceof HttpException) {
        throw error;
      }
      // Handle unexpected errors
      console.error('Service creation failed:', error);
      throw new BadRequestException({
        message: 'Failed to create service',
        error: 'Internal server error',
      });
    }
  }
}
