import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateKnowledgeArticleDto } from './dto/create-knowledge-article.dto.js';
import { UpdateKnowledgeArticleDto } from './dto/update-knowledge-article.dto.js';

export interface KnowledgeArticleResponse {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    data: CreateKnowledgeArticleDto,
  ): Promise<KnowledgeArticleResponse> {
    const existing = await this.prisma.client.orm.public.KnowledgeArticle
      .where({ slug: data.slug })
      .select('id')
      .first();

    if (existing) {
      throw new ConflictException('Slug artikel sudah digunakan');
    }

    const article = await this.prisma.client.orm.public.KnowledgeArticle.create({
      title: data.title,
      slug: data.slug,
      content: data.content,
      summary: data.summary,
      createdBy: userId,
    });

    return article;
  }

  async findAll(userId: string): Promise<KnowledgeArticleResponse[]> {
    return this.prisma.client.orm.public.KnowledgeArticle
      .where({ createdBy: userId })
      .select(
        'id',
        'title',
        'slug',
        'content',
        'summary',
        'createdBy',
        'createdAt',
        'updatedAt',
      )
      .all();
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<KnowledgeArticleResponse> {
    const article = await this.prisma.client.orm.public.KnowledgeArticle
      .where({ id, createdBy: userId })
      .select(
        'id',
        'title',
        'slug',
        'content',
        'summary',
        'createdBy',
        'createdAt',
        'updatedAt',
      )
      .first();

    if (!article) {
      throw new NotFoundException('Artikel knowledge tidak ditemukan');
    }

    return article;
  }

  async update(
    userId: string,
    id: string,
    data: UpdateKnowledgeArticleDto,
  ): Promise<KnowledgeArticleResponse> {
    const article = await this.prisma.client.orm.public.KnowledgeArticle
      .where({ id, createdBy: userId })
      .select('id')
      .first();

    if (!article) {
      throw new NotFoundException('Artikel knowledge tidak ditemukan');
    }

    if (data.slug !== undefined) {
      const existing = await this.prisma.client.orm.public.KnowledgeArticle
        .where({ slug: data.slug })
        .select('id')
        .first();

      if (existing && existing.id !== id) {
        throw new ConflictException('Slug artikel sudah digunakan');
      }
    }

    const updated = await this.prisma.client.orm.public.KnowledgeArticle
      .where({ id, createdBy: userId })
      .update({
        title: data.title,
        slug: data.slug,
        content: data.content,
        summary: data.summary,
      });

    if (!updated) {
      throw new NotFoundException('Artikel knowledge tidak ditemukan');
    }

    return updated;
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    const article = await this.prisma.client.orm.public.KnowledgeArticle
      .where({ id, createdBy: userId })
      .select('id')
      .first();

    if (!article) {
      throw new NotFoundException('Artikel knowledge tidak ditemukan');
    }

    await this.prisma.client.orm.public.KnowledgeArticle
      .where({ id, createdBy: userId })
      .delete();

    return { message: 'Artikel knowledge berhasil dihapus' };
  }
}
