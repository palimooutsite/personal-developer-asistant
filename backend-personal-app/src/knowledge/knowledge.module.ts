import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { KnowledgeController } from './knowledge.controller.js';
import { KnowledgeService } from './knowledge.service.js';
import { TagsController } from './tags.controller.js';
import { TagsService } from './tags.service.js';
import { ArticleTagsController } from './article-tags.controller.js';
import { ArticleTagsService } from './article-tags.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  controllers: [
    KnowledgeController,
    TagsController,
    ArticleTagsController,
  ],
  providers: [
    KnowledgeService,
    TagsService,
    ArticleTagsService,
    PrismaService,
  ],
})
export class KnowledgeModule {}
