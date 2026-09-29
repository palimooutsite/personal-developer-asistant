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

import {
  KnowledgeService,
  KnowledgeArticleResponse,
} from './knowledge.service.js';

import { CreateKnowledgeArticleDto } from './dto/create-knowledge-article.dto.js';
import { UpdateKnowledgeArticleDto } from './dto/update-knowledge-article.dto.js';
import { QueryKnowledgeDto } from './dto/query-knowledge.dto.js';

import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { PermissionGuard } from '../tenants/roles/permission.guard.js';
import { RequirePermission } from '../tenants/roles/require-permission.decorator.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';

import type { TenantRequest } from '../tenants/types/tenant-request.js';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
  ) {}

  @Post()
  @RequirePermission('KNOWLEDGE', 'CREATE')
  async create(
    @Body() body: CreateKnowledgeArticleDto,
    @Req() req: TenantRequest,
  ): Promise<KnowledgeArticleResponse> {
    return this.knowledgeService.create(
      req.user.userId,
      req.tenant.tenantId,
      body,
    );
  }

  @Get()
  @RequirePermission('KNOWLEDGE', 'READ')
  async findAll(
    @Query() query: QueryKnowledgeDto,
    @Req() req: TenantRequest,
  ) {
    return this.knowledgeService.findAll(
      req.user.userId,
      req.tenant.tenantId,
      query,
    );
  }

  @Get(':id')
  @RequirePermission('KNOWLEDGE', 'READ')
  async findOne(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<KnowledgeArticleResponse> {
    return this.knowledgeService.findOne(
      req.user.userId,
      req.tenant.tenantId,
      id,
    );
  }

  @Patch(':id')
  @RequirePermission('KNOWLEDGE', 'UPDATE')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateKnowledgeArticleDto,
    @Req() req: TenantRequest,
  ): Promise<KnowledgeArticleResponse> {
    return this.knowledgeService.update(
      req.user.userId,
      req.tenant.tenantId,
      id,
      body,
    );
  }

  @Delete(':id')
  @RequirePermission('KNOWLEDGE', 'DELETE')
  async remove(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.knowledgeService.remove(
      req.user.userId,
      req.tenant.tenantId,
      id,
    );
  }
}