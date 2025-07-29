import { Controller, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/is-public.decorator';

@Controller('service')
export class ServiceController {
  // Controller methods will go here

  @Public()
  @Post('example')
  exampleMethod() {
    return { message: 'This is an example endpoint' };
  }
}
