import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

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
}
