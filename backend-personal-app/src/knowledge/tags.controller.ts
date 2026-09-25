import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import type { TenantRequest } from '../tenants/types/tenant-request.js';

import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';
import {
  TagResponse,
  TagsService,
} from './tags.service.js';

@Controller('tags')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
  ) {}

  @Post()
  async create(
    @Body() body: CreateTagDto,
    @Req() req: TenantRequest,
  ): Promise<TagResponse> {
    return this.tagsService.create(
      req.tenant.tenantId,
      body,
    );
  }

  @Get()
  async findAll(
    @Req() req: TenantRequest,
  ): Promise<TagResponse[]> {
    return this.tagsService.findAll(
      req.tenant.tenantId,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<TagResponse> {
    return this.tagsService.findOne(
      req.tenant.tenantId,
      id,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateTagDto,
    @Req() req: TenantRequest,
  ): Promise<TagResponse> {
    return this.tagsService.update(
      req.tenant.tenantId,
      id,
      body,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.tagsService.remove(
      req.tenant.tenantId,
      id,
    );
  }
}