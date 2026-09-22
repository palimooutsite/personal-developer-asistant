import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('db')
  async checkDatabase() {
    try {
      const users = await this.prisma.client.orm.public.User
        .select('id')
        .all();

      return {
        status: 'ok',
        database: 'connected',
        usersChecked: users.length,
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      };
    }
  }
}