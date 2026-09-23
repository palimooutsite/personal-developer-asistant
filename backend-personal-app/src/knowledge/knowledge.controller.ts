import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { KnowledgeService, KnowledgeArticleResponse } from './knowledge.service.js';
import { CreateKnowledgeArticleDto } from './dto/create-knowledge-article.dto.js';
import { UpdateKnowledgeArticleDto } from './dto/update-knowledge-article.dto.js';
import { QueryKnowledgeDto } from './dto/query-knowledge.dto.js';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  async create(
    @Body() body: CreateKnowledgeArticleDto,
    @Req() req: AuthRequest,
  ): Promise<KnowledgeArticleResponse> {
    return this.knowledgeService.create(req.user.userId, body);
  }

  @Get()
  async findAll(
    @Query() query: QueryKnowledgeDto,
    @Req() req: AuthRequest,
  ) {
    return this.knowledgeService.findAll(req.user.userId, query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<KnowledgeArticleResponse> {
    return this.knowledgeService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateKnowledgeArticleDto,
    @Req() req: AuthRequest,
  ): Promise<KnowledgeArticleResponse> {
    return this.knowledgeService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<{ message: string }> {
    return this.knowledgeService.remove(req.user.userId, id);
  }
}
