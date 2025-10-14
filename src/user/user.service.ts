import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

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

  async findOne(
    payload: {
      email?: string;
      id?: string;
      phoneNumber?: string;
    },
    prisma?: any,
  ): Promise<User | null> {
    try {
      // Validate that at least one identifier is provided
      if (!payload.email && !payload.id && !payload.phoneNumber) {
        throw new BadRequestException({
          message: 'Either email or id or phone number must be provided',
          error: 'Missing identifier',
        });
      }

      // Build the where clause based on provided parameters
      const where: any = {};
      if (payload.email) {
        where.email = payload.email;
      }
      if (payload.id) {
        where.id = payload.id;
      }
      if (payload.phoneNumber) {
        where.phoneNumber = payload.phoneNumber;
      }

      // Use provided prisma client or default to this.prisma
      const client = prisma || this.prisma;
      const user = await client.user.findFirst({
        where,
      });

      return user; // Returns null if not found, user object if found
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Error finding user',
        error: error?.message || error,
      });
    }
  }

  async findUserByPhoneNumber(
    phoneNumber: string,
    prisma: any,
  ): Promise<User | null> {
    try {
      return await prisma.user.findFirst({
        where: {
          phoneNumber: phoneNumber,
          role: 'customer',
        },
      });
    } catch (error) {
      console.error('Error finding user by phone number:', error);
      return null;
    }
  }

  async findUserByEmailOrPhone(
    emailOrPhone: string,
    prisma: any,
  ): Promise<User[]> {
    try {
      console.log('Searching for users with:', emailOrPhone);

      // Get all users with this email or phone
      const users = await prisma.user.findMany({
        where: {
          OR: [{ email: emailOrPhone }, { phoneNumber: emailOrPhone }],
        },
      });

      console.log(`Found ${users.length} users`);
      return users;
    } catch (error) {
      console.error('Error finding users by email or phone:', error);
      return [];
    }
  }

  async createUnregisteredUser(customerInfo: any, prisma: any) {
    // Generate random email if no email provided
    const randomEmail =
      customerInfo.email ||
      `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@barbershop.local`;

    return await prisma.user.create({
      data: {
        firstName: customerInfo.firstName || 'Customer',
        lastName: customerInfo.lastName || null,
        email: randomEmail,
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

  async getUserProfile(userId: string, prisma: any) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException({
          message: 'User not found',
          error: 'User does not exist',
        });
      }

      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Error fetching user profile',
        error: error?.message || error,
      });
    }
  }

  async updateUserProfile(
    userId: string,
    updateData: UpdateUserProfileDto,
    prisma: any,
  ) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException({
          message: 'User not found',
          error: 'User does not exist',
        });
      }

      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Error updating user profile',
        error: error?.message || error,
      });
    }
  }
}
