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
import { QueueState } from '../common/enums/queue-state.enum';
import { GetMyQueueStatusDto } from './dto/get-my-queue-status.dto';
import { GetQueueByStateDto } from './dto/get-queue-by-state.dto';
import { Public } from 'src/auth/decorators/is-public.decorator';

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

  async getMyQueueStatus(
    userId: string,
    dto: GetMyQueueStatusDto,
    prisma: Prisma.TransactionClient,
  ) {
    const { barberShopId } = dto;
    // Get all queue entries for this shop ordered by joinedAt (FIFO)
    // This single query gets all active queue entries including the user's
    const allQueueEntries = await prisma.shopQueue.findMany({
      where: {
        barberShopId: barberShopId,
        state: QueueState.IN_QUEUE,
        status: 'active',
      },
      orderBy: {
        joinedAt: 'asc', // First in, first out
      },
      select: {
        id: true,
        userId: true,
        joinedAt: true,
        state: true,
        barberShop: {
          select: {
            id: true,
            name: true,
            address: true,
            isOpen: true,
          },
        },
      },
    });

    // Find user's queue entry in the fetched list
    const myQueueEntry = allQueueEntries.find(
      (entry) => entry.userId === userId,
    );

    if (!myQueueEntry) {
      throw new NotFoundException({
        message: 'You are not in the queue for this shop',
        error: 'Queue entry not found',
      });
    }

    // Find user's position in the queue (already ordered)
    const myPosition = allQueueEntries.findIndex(
      (entry) => entry.userId === userId,
    );

    // Calculate people ahead
    const peopleAhead = myPosition >= 0 ? myPosition : 0;

    // Get total people in queue
    const totalInQueue = allQueueEntries.length;

    return {
      queueEntry: {
        id: myQueueEntry.id,
        state: myQueueEntry.state,
        joinedAt: myQueueEntry.joinedAt,
      },
      barberShop: myQueueEntry.barberShop,
      queueStatus: {
        myPosition: myPosition + 1, // 1-indexed position
        peopleAhead,
        totalInQueue,
        estimatedWaitingPeople: peopleAhead,
      },
    };
  }

  @Public()
  async getQueueByState(
    dto: GetQueueByStateDto,
    prisma: Prisma.TransactionClient,
  ) {
    const { barberShopId, state, page, limit } = dto;
    const skip = (page - 1) * limit;

    const [queueEntries, total] = await Promise.all([
      prisma.shopQueue.findMany({
        where: {
          barberShopId,
          state,
          status: 'active',
        },
        select: {
          id: true,
          userId: true,
          state: true,
          joinedAt: true,
          servedAt: true,
          visit: {
            select: {
              totalAmount: true,
              visitServices: {
                where: {
                  status: 'active',
                },
                select: {
                  id: true,
                  service: {
                    select: {
                      serviceName: true,
                      price: true,
                      estimatedTime: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.shopQueue.count({
        where: {
          barberShopId,
          state,
          status: 'active',
        },
      }),
    ]);

    return {
      data: queueEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
