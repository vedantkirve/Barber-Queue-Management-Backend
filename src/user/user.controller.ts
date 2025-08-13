import {
  Controller,
  Get,
  Query,
  Request,
  BadRequestException,
  HttpException,
  UsePipes,
} from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  SearchUsersQuerySchema,
  SearchUsersQueryDto,
} from './dto/search-users-query.dto';

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
}
