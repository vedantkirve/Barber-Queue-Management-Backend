import {
  Controller,
  Get,
  Query,
  Request,
  BadRequestException,
  HttpException,
  UsePipes,
  Put,
  Body,
} from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  SearchUsersQuerySchema,
  SearchUsersQueryDto,
} from './dto/search-users-query.dto';
import {
  UpdateUserProfileSchema,
  UpdateUserProfileDto,
} from './dto/update-user-profile.dto';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('search')
  @UsePipes(new ZodValidationPipe(SearchUsersQuerySchema))
  async searchUsers(@Query() query: SearchUsersQueryDto, @Request() req: any) {
    try {
      const userId = req.user?.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.userService.searchUsers(query, userId, prisma);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('User search failed:', error);
      throw new BadRequestException({
        message: 'Failed to search users',
        error: 'Internal server error',
      });
    }
  }

  @Get('profile')
  async getUserProfile(@Request() req: any) {
    try {
      const userId = req.user?.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.userService.getUserProfile(userId, prisma);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Get user profile failed:', error);
      throw new BadRequestException({
        message: 'Failed to get user profile',
        error: 'Internal server error',
      });
    }
  }

  @Put('profile')
  @UsePipes(new ZodValidationPipe(UpdateUserProfileSchema))
  async updateUserProfile(
    @Body() updateData: UpdateUserProfileDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId;

      return await this.prisma.$transaction(async (prisma) => {
        return await this.userService.updateUserProfile(
          userId,
          updateData,
          prisma,
        );
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Update user profile failed:', error);
      throw new BadRequestException({
        message: 'Failed to update user profile',
        error: 'Internal server error',
      });
    }
  }
}
