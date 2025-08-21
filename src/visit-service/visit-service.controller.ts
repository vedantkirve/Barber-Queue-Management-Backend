import { Controller } from '@nestjs/common';
import { VisitServiceService } from './visit-service.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('visit-service')
export class VisitServiceController {
  constructor(
    private readonly visitServiceService: VisitServiceService,
    private readonly prisma: PrismaService,
  ) {}
}
