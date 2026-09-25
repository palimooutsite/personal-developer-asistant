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
  CodeSnippetResponse,
  SnippetsService,
} from './snippets.service.js';

import { CreateCodeSnippetDto } from './dto/create-code-snippet.dto.js';
import { UpdateCodeSnippetDto } from './dto/update-code-snippet.dto.js';
import { QuerySnippetDto } from './dto/query-snippet.dto.js';

import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';

import type { TenantRequest } from '../tenants/types/tenant-request.js';

@Controller('snippets')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class SnippetsController {
  constructor(
    private readonly snippetsService: SnippetsService,
  ) {}

  @Post()
  create(
    @Body() body: CreateCodeSnippetDto,
    @Req() req: TenantRequest,
  ): Promise<CodeSnippetResponse> {
    return this.snippetsService.create(
      req.user.userId,
      req.tenant.tenantId,
      body,
    );
  }

  @Get()
  findAll(
    @Query() query: QuerySnippetDto,
    @Req() req: TenantRequest,
  ) {
    return this.snippetsService.findAll(
      req.user.userId,
      req.tenant.tenantId,
      query,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<CodeSnippetResponse> {
    return this.snippetsService.findOne(
      req.user.userId,
      req.tenant.tenantId,
      id,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateCodeSnippetDto,
    @Req() req: TenantRequest,
  ): Promise<CodeSnippetResponse> {
    return this.snippetsService.update(
      req.user.userId,
      req.tenant.tenantId,
      id,
      body,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.snippetsService.remove(
      req.user.userId,
      req.tenant.tenantId,
      id,
    );
  }
}