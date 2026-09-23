import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCodeSnippetDto } from './dto/create-code-snippet.dto.js';
import { UpdateCodeSnippetDto } from './dto/update-code-snippet.dto.js';

export interface CodeSnippetResponse {
  id: string;
  title: string;
  language: string;
  code: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SnippetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateCodeSnippetDto): Promise<CodeSnippetResponse> {
    return this.prisma.client.orm.public.CodeSnippet.create({
      title: data.title,
      language: data.language,
      code: data.code,
      description: data.description,
      createdBy: userId,
    });
  }

  async findAll(userId: string): Promise<CodeSnippetResponse[]> {
    return this.prisma.client.orm.public.CodeSnippet
      .where({ createdBy: userId })
      .select('id', 'title', 'language', 'code', 'description', 'createdBy', 'createdAt', 'updatedAt')
      .all();
  }

  async findOne(userId: string, id: string): Promise<CodeSnippetResponse> {
    const snippet = await this.prisma.client.orm.public.CodeSnippet
      .where({ id, createdBy: userId })
      .select('id', 'title', 'language', 'code', 'description', 'createdBy', 'createdAt', 'updatedAt')
      .first();

    if (!snippet) throw new NotFoundException('Code snippet tidak ditemukan');
    return snippet;
  }

  async update(userId: string, id: string, data: UpdateCodeSnippetDto): Promise<CodeSnippetResponse> {
    await this.findOne(userId, id);

    const updated = await this.prisma.client.orm.public.CodeSnippet
      .where({ id, createdBy: userId })
      .update({
        title: data.title,
        language: data.language,
        code: data.code,
        description: data.description,
      });

    if (!updated) throw new NotFoundException('Code snippet tidak ditemukan');
    return updated;
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    await this.findOne(userId, id);
    await this.prisma.client.orm.public.CodeSnippet.where({ id, createdBy: userId }).delete();
    return { message: 'Code snippet berhasil dihapus' };
  }
}
