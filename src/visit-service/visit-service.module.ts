import { Module } from '@nestjs/common';
import { VisitServiceController } from './visit-service.controller';
import { VisitServiceService } from './visit-service.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisitServiceController],
  providers: [VisitServiceService],
  exports: [VisitServiceService],
})
export class VisitServiceModule {}
