import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SnippetTagsService, SnippetTagResponse } from './snippet-tags.service.js';
import { AddSnippetTagDto } from './dto/add-snippet-tag.dto.js';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('snippets/:snippetId/tags')
@UseGuards(JwtAuthGuard)
export class SnippetTagsController {
  constructor(private readonly snippetTagsService: SnippetTagsService) {}

  @Get()
  findAll(@Param('snippetId') snippetId: string, @Req() req: AuthRequest): Promise<SnippetTagResponse[]> {
    return this.snippetTagsService.findAll(req.user.userId, snippetId);
  }

  @Post()
  add(@Param('snippetId') snippetId: string, @Body() body: AddSnippetTagDto, @Req() req: AuthRequest): Promise<SnippetTagResponse> {
    return this.snippetTagsService.add(req.user.userId, snippetId, body);
  }

  @Delete(':tagId')
  remove(@Param('snippetId') snippetId: string, @Param('tagId') tagId: string, @Req() req: AuthRequest): Promise<{ message: string }> {
    return this.snippetTagsService.remove(req.user.userId, snippetId, tagId);
  }
}
