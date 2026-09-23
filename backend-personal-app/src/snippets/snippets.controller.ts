import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SnippetsService, CodeSnippetResponse } from './snippets.service.js';
import { CreateCodeSnippetDto } from './dto/create-code-snippet.dto.js';
import { UpdateCodeSnippetDto } from './dto/update-code-snippet.dto.js';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('snippets')
@UseGuards(JwtAuthGuard)
export class SnippetsController {
  constructor(private readonly snippetsService: SnippetsService) {}

  @Post()
  create(@Body() body: CreateCodeSnippetDto, @Req() req: AuthRequest): Promise<CodeSnippetResponse> {
    return this.snippetsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: AuthRequest): Promise<CodeSnippetResponse[]> {
    return this.snippetsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthRequest): Promise<CodeSnippetResponse> {
    return this.snippetsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCodeSnippetDto, @Req() req: AuthRequest): Promise<CodeSnippetResponse> {
    return this.snippetsService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthRequest): Promise<{ message: string }> {
    return this.snippetsService.remove(req.user.userId, id);
  }
}
