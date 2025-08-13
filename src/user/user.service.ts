import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(user: User) {
    try {
      return await this.prisma.user.create({
        data: user,
      });
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Failed to create user',
        error: error?.message || error,
      });
    }
  }

  async findOne(payload: { email: string }) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { email: payload.email },
      });

      if (!user) {
        throw new NotFoundException({
          message: `User not found`,
          error: `No user with email ${payload.email}`,
        });
      }

      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Error finding user',
        error: error?.message || error,
      });
    }
  }

  async createUnregisteredUser(customerInfo: any, prisma: any) {
    return await prisma.user.create({
      data: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email || null,
        phoneNumber: customerInfo.phoneNumber || null,
        password: null, // No password for walk-in customers
        role: 'customer',
        status: 'active',
      },
    });
  }

  async searchUsers(query: SearchUsersQueryDto, userId: string, prisma: any) {
    const { q, page, limit, sortBy, sortOrder } = query;

    // Build search query across multiple fields
    const where = {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q, mode: 'insensitive' } },
      ],
      // Exclude the current user from search results
      NOT: {
        id: userId,
      },
      role: 'customer',
    };

    console.log('where', JSON.stringify(where));

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute search query
    const [users, total]: [User[], number] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          createdAt: true,
          // Exclude sensitive fields like password
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      searchInfo: {
        query: q,
        resultsFound: total,
        fieldsSearched: ['firstName', 'lastName', 'email', 'phoneNumber'],
      },
    };
  }
}
