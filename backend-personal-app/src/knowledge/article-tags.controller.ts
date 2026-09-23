import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import {
  ArticleTagResponse,
  ArticleTagsService,
} from './article-tags.service.js';
import { AddArticleTagDto } from './dto/add-article-tag.dto.js';
import type { AuthRequest } from '../auth/types/auth-request.js';

@Controller('knowledge/:articleId/tags')
@UseGuards(JwtAuthGuard)
export class ArticleTagsController {
  constructor(private readonly articleTagsService: ArticleTagsService) {}

  @Get()
  async findAll(
    @Param('articleId') articleId: string,
    @Req() req: AuthRequest,
  ): Promise<ArticleTagResponse[]> {
    return this.articleTagsService.findAll(req.user.userId, articleId);
  }

  @Post()
  async add(
    @Param('articleId') articleId: string,
    @Body() body: AddArticleTagDto,
    @Req() req: AuthRequest,
  ): Promise<ArticleTagResponse> {
    return this.articleTagsService.add(req.user.userId, articleId, body);
  }

  @Delete(':tagId')
  async remove(
    @Param('articleId') articleId: string,
    @Param('tagId') tagId: string,
    @Req() req: AuthRequest,
  ): Promise<{ message: string }> {
    return this.articleTagsService.remove(
      req.user.userId,
      articleId,
      tagId,
    );
  }
}
