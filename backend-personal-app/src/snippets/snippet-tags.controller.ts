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

import {
  SnippetTagsService,
  SnippetTagResponse,
} from './snippet-tags.service.js';

import { AddSnippetTagDto } from './dto/add-snippet-tag.dto.js';

import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';

import type { TenantRequest } from '../tenants/types/tenant-request.js';

@Controller('snippets/:snippetId/tags')
@UseGuards(
  JwtAuthGuard,
  TenantContextGuard,
)
export class SnippetTagsController {
  constructor(
    private readonly snippetTagsService: SnippetTagsService,
  ) {}

  @Get()
  findAll(
    @Param('snippetId') snippetId: string,
    @Req() req: TenantRequest,
  ): Promise<SnippetTagResponse[]> {
    return this.snippetTagsService.findAll(
      req.user.userId,
      req.tenant.tenantId,
      snippetId,
    );
  }

  @Post()
  add(
    @Param('snippetId') snippetId: string,
    @Body() body: AddSnippetTagDto,
    @Req() req: TenantRequest,
  ): Promise<SnippetTagResponse> {
    return this.snippetTagsService.add(
      req.user.userId,
      req.tenant.tenantId,
      snippetId,
      body,
    );
  }

  @Delete(':tagId')
  remove(
    @Param('snippetId') snippetId: string,
    @Param('tagId') tagId: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.snippetTagsService.remove(
      req.user.userId,
      req.tenant.tenantId,
      snippetId,
      tagId,
    );
  }
}