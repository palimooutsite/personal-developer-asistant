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
  StreamableFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import {
  extname,
  join,
} from 'node:path';

import {
  createReadStream,
  mkdirSync,
} from 'node:fs';

import { randomUUID } from 'node:crypto';

import {
  DocumentsService,
  DocumentResponse,
} from './documents.service.js';

import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';

import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import { PermissionGuard } from '../tenants/roles/permission.guard.js';
import { RequirePermission } from '../tenants/roles/require-permission.decorator.js';

import type { TenantRequest } from '../tenants/types/tenant-request.js';

const DOCUMENT_STORAGE_PATH = join(
  process.cwd(),
  'storage',
  'documents',
);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

mkdirSync(
  DOCUMENT_STORAGE_PATH,
  { recursive: true },
);

@Controller('documents')
@UseGuards(
  JwtAuthGuard,
  TenantContextGuard,
  PermissionGuard,
)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @Post('upload')
  @RequirePermission('DOCUMENTS', 'CREATE')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination:
          DOCUMENT_STORAGE_PATH,

        filename: (
          _req,
          file,
          callback,
        ) => {
          const uniqueName =
            `${Date.now()}-${randomUUID()}${extname(
              file.originalname,
            ).toLowerCase()}`;

          callback(
            null,
            uniqueName,
          );
        },
      }),

      limits: {
        fileSize: MAX_FILE_SIZE,
      },

      fileFilter: (
        _req,
        file,
        callback,
      ) => {
        if (
          !ALLOWED_MIME_TYPES.has(
            file.mimetype,
          )
        ) {
          callback(
            new BadRequestException(
              'Tipe file tidak didukung. Gunakan PDF, DOCX, TXT, atau Markdown.',
            ),
            false,
          );

          return;
        }

        callback(
          null,
          true,
        );
      },
    }),
  )
  upload(
    @UploadedFile()
    file: {
      originalname: string;
      filename: string;
      mimetype: string;
      size: number;
      path: string;
    },

    @Body()
    body: UploadDocumentDto,

    @Req()
    req: TenantRequest,
  ): Promise<DocumentResponse> {
    if (!file) {
      throw new BadRequestException(
        'File wajib diunggah',
      );
    }

    return this.documentsService.upload(
      req.user.userId,
      req.tenant.tenantId,
      body.title,
      body.description,
      file,
    );
  }

  @Post()
  @RequirePermission('DOCUMENTS', 'CREATE')
  create(
    @Body()
    body: CreateDocumentDto,

    @Req()
    req: TenantRequest,
  ): Promise<DocumentResponse> {
    return this.documentsService.create(
      req.user.userId,
      req.tenant.tenantId,
      body,
    );
  }

  @Get()
  @RequirePermission('DOCUMENTS', 'READ')
  findAll(
    @Req()
    req: TenantRequest,
  ): Promise<DocumentResponse[]> {
    return this.documentsService.findAll(
      req.user.userId,
      req.tenant.tenantId,
    );
  }

  @Get(':id/file')
  @RequirePermission('DOCUMENTS', 'READ')
  async file(
    @Param('id')
    id: string,

    @Req()
    req: TenantRequest,
  ): Promise<StreamableFile> {
    const document =
      await this.documentsService.getFile(
        req.user.userId,
        req.tenant.tenantId,
        id,
      );

    return new StreamableFile(
      createReadStream(
        document.filePath,
      ),
      {
        type: document.mimeType,
        disposition:
          `inline; filename*=UTF-8''${encodeURIComponent(
            document.fileName,
          )}`,
      },
    );
  }

  @Get(':id')
  @RequirePermission('DOCUMENTS', 'READ')
  findOne(
    @Param('id')
    id: string,

    @Req()
    req: TenantRequest,
  ): Promise<DocumentResponse> {
    return this.documentsService.findOne(
      req.user.userId,
      req.tenant.tenantId,
      id,
    );
  }

  @Patch(':id')
  @RequirePermission('DOCUMENTS', 'UPDATE')
  update(
    @Param('id')
    id: string,

    @Body()
    body: UpdateDocumentDto,

    @Req()
    req: TenantRequest,
  ): Promise<DocumentResponse> {
    return this.documentsService.update(
      req.user.userId,
      req.tenant.tenantId,
      id,
      body,
    );
  }

  @Delete(':id')
  @RequirePermission('DOCUMENTS', 'DELETE')
  remove(
    @Param('id')
    id: string,

    @Req()
    req: TenantRequest,
  ): Promise<{
    message: string;
  }> {
    return this.documentsService.remove(
      req.user.userId,
      req.tenant.tenantId,
      id,
    );
  }
}