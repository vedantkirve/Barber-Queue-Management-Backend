import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JoinQueueDto } from './dto/join-queue.dto';

import { UpdateQueueStateDto } from './dto/update-queue-state.dto';
import { UserService } from '../user/user.service';
import { Prisma } from '@prisma/client';
import { QueueState } from '../common/enums/queue-state.enum';
import { GetMyQueueStatusDto } from './dto/get-my-queue-status.dto';
import { GetQueueByStateDto } from './dto/get-queue-by-state.dto';
import { Public } from 'src/auth/decorators/is-public.decorator';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ShopQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly notificationsService: NotificationsService,
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
  async updateQueueState(
    dto: UpdateQueueStateDto,
    prisma: Prisma.TransactionClient,
  ) {
    const { queueId, state } = dto;
    // Ensure the queue entry exists and is active before updating
    const existing = await prisma.shopQueue.findFirst({
      where: { id: queueId, status: 'active' },
      select: { id: true, barberShopId: true },
    });

    if (!existing) {
      throw new NotFoundException({
        message: 'Queue entry not found or inactive',
        error: 'Invalid queue id',
      });
    }

    const updatedQueue = await prisma.shopQueue.update({
      where: { id: queueId },
      data: { state },
      select: { id: true, state: true, barberShopId: true, userId: true },
    });

    // If a customer has been picked, notify the next one in the queue
    if (state === QueueState.PICKED) {
      const nextInQueue = await prisma.shopQueue.findFirst({
        where: {
          barberShopId: updatedQueue.barberShopId,
          state: QueueState.IN_QUEUE,
          status: 'active',
        },
        orderBy: { joinedAt: 'asc' },
        select: {
          id: true,
          userId: true,
          barberShop: { select: { name: true } },
        },
      });

      console.log('nextInQueue-->>', nextInQueue);

      if (nextInQueue) {
        // Fire-and-forget notification; do not block the response if push fails
        await this.notificationsService.sendNotification(
          {
            userId: nextInQueue.userId,
            title: "You're next in line",
            message: `Get ready! You're next at ${nextInQueue.barberShop.name}.`,
          },
          prisma,
        );
      }
    }

    return updatedQueue;
  }

  async getQueueByState(
    dto: GetQueueByStateDto,
    prisma: Prisma.TransactionClient,
  ) {
    const { barberShopId, state, page, limit } = dto;
    const skip = (page - 1) * limit;

    // First, get queue entries and total count
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

    // Extract unique user IDs from queue entries
    const userIds = [...new Set(queueEntries.map((entry) => entry.userId))];

    console.log('userIds-->>', userIds);

    // Get all user information in one query
    const users = await this.userService.findUsersByIds(userIds, prisma);

    // Create a map of user data for quick lookup
    const userMap = new Map(users.map((user) => [user.id, user]));

    // Merge user information into queue entries and prepare response
    const data = queueEntries.map((entry) => ({
      ...entry,
      user: userMap.get(entry.userId) || null,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserCurrentQueues(userId: string, prisma: Prisma.TransactionClient) {
    try {
      // Get current queue entries (in_queue or picked state)
      const currentQueues = await prisma.shopQueue.findMany({
        where: {
          userId,
          state: { in: ['in_queue', 'picked'] },
          status: 'active',
        },
        orderBy: { joinedAt: 'asc' },
        include: {
          barberShop: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              isOpen: true,
            },
          },
        },
      });

      // Calculate queue positions and estimated wait times
      const enrichedQueues = await Promise.all(
        currentQueues.map(async (queue) => {
          // Get queue position (how many people are ahead)
          const queuePosition = await prisma.shopQueue.count({
            where: {
              barberShopId: queue.barberShopId,
              state: 'in_queue',
              joinedAt: { lt: queue.joinedAt },
              status: 'active',
            },
          });

          // Calculate estimated wait time based on queue position
          // Assuming average service time of 30 minutes per customer
          const estimatedWaitTime =
            queue.state === 'picked' ? 0 : (queuePosition + 1) * 30;

          return {
            ...queue,
            queuePosition: queuePosition + 1, // Position starts from 1
            estimatedWaitTime,
          };
        }),
      );

      return enrichedQueues;
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Error fetching user current queues',
        error: error?.message || error,
      });
    }
  }
}
