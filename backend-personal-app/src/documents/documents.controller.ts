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
import { DocumentsService, DocumentResponse } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(
    @Body() body: CreateDocumentDto,
    @Req() req: AuthRequest,
  ): Promise<DocumentResponse> {
    return this.documentsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: AuthRequest): Promise<DocumentResponse[]> {
    return this.documentsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<DocumentResponse> {
    return this.documentsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateDocumentDto,
    @Req() req: AuthRequest,
  ): Promise<DocumentResponse> {
    return this.documentsService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<{ message: string }> {
    return this.documentsService.remove(req.user.userId, id);
  }
}
