import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { UserService } from '../user/user.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShopQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async joinQueue(
    userId: string,
    dto: JoinQueueDto,
    prisma: Prisma.TransactionClient,
  ) {
    // Verify user exists and is a customer
    const user = await this.userService.findOne({ id: userId }, prisma);

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        error: 'User does not exist',
      });
    }

    if (user.role !== 'customer') {
      throw new ForbiddenException({
        message: 'Only customers can join the queue',
        error: 'Invalid user role',
      });
    }

    // Verify barber shop exists
    const barberShop = await prisma.barberShop.findUnique({
      where: { id: dto.barberShopId },
    });

    if (!barberShop) {
      throw new NotFoundException({
        message: 'Barber shop not found',
        error: 'Barber shop does not exist',
      });
    }

    // Check if barber shop is open
    if (!barberShop.isOpen) {
      throw new BadRequestException({
        message: 'Barber shop is currently closed',
        error: 'Shop not accepting customers',
      });
    }

    // Check if user is already in queue for this shop with active status
    const existingQueueEntry = await prisma.shopQueue.findFirst({
      where: {
        userId,
        barberShopId: dto.barberShopId,
        state: {
          in: ['in_queue', 'picked'],
        },
        status: 'active',
      },
    });

    if (existingQueueEntry) {
      throw new BadRequestException({
        message: 'You are already in the queue for this shop',
        error: 'Duplicate queue entry',
      });
    }

    // Add user to queue
    const queueEntry = await prisma.shopQueue.create({
      data: {
        userId,
        barberShopId: dto.barberShopId,
        state: 'in_queue',
        status: 'active',
      },
      include: {
        barberShop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return queueEntry;
  }
}
