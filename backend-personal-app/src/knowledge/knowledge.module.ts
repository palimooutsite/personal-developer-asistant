import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { KnowledgeController } from './knowledge.controller.js';
import { KnowledgeService } from './knowledge.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, PrismaService],
})
export class KnowledgeModule {}
