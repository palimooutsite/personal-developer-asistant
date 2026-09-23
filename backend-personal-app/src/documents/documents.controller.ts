import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DocumentsService, DocumentResponse } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

const DOCUMENT_STORAGE_PATH = join(process.cwd(), 'storage', 'documents');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

mkdirSync(DOCUMENT_STORAGE_PATH, { recursive: true });

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: DOCUMENT_STORAGE_PATH,
        filename: (_req, file, callback) => {
          const uniqueName = `${Date.now()}-${randomUUID()}${extname(file.originalname).toLowerCase()}`;
          callback(null, uniqueName);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              'Tipe file tidak didukung. Gunakan PDF, DOCX, TXT, atau Markdown.',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(
    @UploadedFile() file: {
      originalname: string;
      filename: string;
      mimetype: string;
      size: number;
      path: string;
    },
    @Body() body: UploadDocumentDto,
    @Req() req: AuthRequest,
  ): Promise<DocumentResponse> {
    if (!file) {
      throw new BadRequestException('File wajib diunggah');
    }

    return this.documentsService.upload(
      req.user.userId,
      body.title,
      body.description,
      file,
    );
  }

  @Post()
  create(@Body() body: CreateDocumentDto, @Req() req: AuthRequest): Promise<DocumentResponse> {
    return this.documentsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: AuthRequest): Promise<DocumentResponse[]> {
    return this.documentsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthRequest): Promise<DocumentResponse> {
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
  remove(@Param('id') id: string, @Req() req: AuthRequest): Promise<{ message: string }> {
    return this.documentsService.remove(req.user.userId, id);
  }
}
