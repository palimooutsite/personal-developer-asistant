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
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import type { TenantRequest } from '../tenants/types/tenant-request.js';

import {
  ArticleTagResponse,
  ArticleTagsService,
} from './article-tags.service.js';

import { AddArticleTagDto } from './dto/add-article-tag.dto.js';

@Controller('knowledge/:articleId/tags')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class ArticleTagsController {
  constructor(
    private readonly articleTagsService: ArticleTagsService,
  ) {}

  @Get()
  async findAll(
    @Param('articleId') articleId: string,
    @Req() req: TenantRequest,
  ): Promise<ArticleTagResponse[]> {
    return this.articleTagsService.findAll(
      req.user.userId,
      req.tenant.tenantId,
      articleId,
    );
  }

  @Post()
  async add(
    @Param('articleId') articleId: string,
    @Body() body: AddArticleTagDto,
    @Req() req: TenantRequest,
  ): Promise<ArticleTagResponse> {
    return this.articleTagsService.add(
      req.user.userId,
      req.tenant.tenantId,
      articleId,
      body,
    );
  }

  @Delete(':tagId')
  async remove(
    @Param('articleId') articleId: string,
    @Param('tagId') tagId: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.articleTagsService.remove(
      req.user.userId,
      req.tenant.tenantId,
      articleId,
      tagId,
    );
  }
}