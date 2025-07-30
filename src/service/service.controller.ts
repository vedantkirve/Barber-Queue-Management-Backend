import { Controller, Post, Body, Request } from '@nestjs/common';
import { ServiceService } from './service.service';

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post('create')
  async createService(@Body() createServiceDto: any, @Request() req: any) {
    // TODO: Add proper DTO validation
    const userId = req.user.userId;
    return this.serviceService.createService(createServiceDto, userId);
  }
}
