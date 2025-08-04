import { Controller } from '@nestjs/common';
import { VisitService } from './visit.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('visit')
export class VisitController {
  constructor(
    private readonly visitService: VisitService,
    private readonly prisma: PrismaService,
  ) {}
}
