import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitServiceService {
  constructor(private readonly prisma: PrismaService) {}

  // Deactivate visit services by marking status as inactive
  async deactivateVisitServices(
    visitId: string,
    prisma: any,
  ): Promise<{ message: string; deactivatedCount: number } | null> {
    // Check if there are any active visit services for this visit
    const activeVisitServices = await prisma.visitService.findMany({
      where: {
        visitId: visitId,
        status: 'active',
      },
    });

    if (activeVisitServices.length === 0) {
      return null;
    }

    // Deactivate all active visit services
    const result = await prisma.visitService.updateMany({
      where: {
        visitId: visitId,
        status: 'active',
      },
      data: {
        status: 'inactive',
      },
    });

    return result;
  }
}
