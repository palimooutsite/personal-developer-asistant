import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { access, unlink } from 'node:fs/promises';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

export interface UploadedDocumentFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

export interface DocumentResponse {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    userId: string,
    tenantId: string,
    data: CreateDocumentDto,
  ): Promise<DocumentResponse> {
    return this.prisma.client.orm.public.Document.create({
      title: data.title,
      description: data.description,
      fileName: data.fileName,
      filePath: data.filePath,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      createdBy: userId,
      tenantId,
    });
  }

  async upload(
    userId: string,
    tenantId: string,
    title: string,
    description: string | undefined,
    file: UploadedDocumentFile,
  ): Promise<DocumentResponse> {
    try {
      return await this.prisma.client.orm.public.Document.create({
        title,
        description,
        fileName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: String(file.size),
        createdBy: userId,
        tenantId,
      });
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  async findAll(
    userId: string,
    tenantId: string,
  ): Promise<DocumentResponse[]> {
    return this.prisma.client.orm.public.Document
      .where({
        createdBy: userId,
        tenantId,
      })
      .select(
        'id',
        'title',
        'description',
        'fileName',
        'filePath',
        'mimeType',
        'fileSize',
        'createdBy',
        'createdAt',
        'updatedAt',
      )
      .all();
  }

  async findOne(
    userId: string,
    tenantId: string,
    id: string,
  ): Promise<DocumentResponse> {
    const document =
      await this.prisma.client.orm.public.Document
        .where({
          id,
          createdBy: userId,
          tenantId,
        })
        .select(
          'id',
          'title',
          'description',
          'fileName',
          'filePath',
          'mimeType',
          'fileSize',
          'createdBy',
          'createdAt',
          'updatedAt',
        )
        .first();

    if (!document) {
      throw new NotFoundException(
        'Document tidak ditemukan',
      );
    }

    return document;
  }

  async getFile(
    userId: string,
    tenantId: string,
    id: string,
  ): Promise<DocumentResponse> {
    const document =
      await this.findOne(
        userId,
        tenantId,
        id,
      );

    try {
      await access(document.filePath);
    } catch {
      throw new NotFoundException(
        'File document tidak ditemukan',
      );
    }

    return document;
  }

  async update(
    userId: string,
    tenantId: string,
    id: string,
    data: UpdateDocumentDto,
  ): Promise<DocumentResponse> {
    await this.findOne(
      userId,
      tenantId,
      id,
    );

    const updated =
      await this.prisma.client.orm.public.Document
        .where({
          id,
          createdBy: userId,
          tenantId,
        })
        .update({
          title: data.title,
          description: data.description,
        });

    if (!updated) {
      throw new NotFoundException(
        'Document tidak ditemukan',
      );
    }

    return updated;
  }

  async remove(
    userId: string,
    tenantId: string,
    id: string,
  ): Promise<{ message: string }> {
    const document =
      await this.findOne(
        userId,
        tenantId,
        id,
      );

    await this.prisma.client.orm.public.Document
      .where({
        id,
        createdBy: userId,
        tenantId,
      })
      .delete();

    await unlink(
      document.filePath,
    ).catch(() => undefined);

    return {
      message:
        'Document berhasil dihapus',
    };
  }
}