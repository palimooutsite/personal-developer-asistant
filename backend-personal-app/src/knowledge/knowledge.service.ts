import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { BillingFeatureService } from '../billing/feature.service.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingFeatureService: BillingFeatureService,
  ) {}

  async create(
    userId: string,
    tenantId: string,
    data: CreateKnowledgeArticleDto,
  ): Promise<KnowledgeArticleResponse> {
    return this.billingFeatureService.withLimitLock(
      tenantId,
      userId,
      'KNOWLEDGE',
      async (client) =>
        (await client.orm.public.KnowledgeArticle.where({ tenantId }).select('id').all()).length,
      async (tx) => {
        const existing =
          await tx.orm.public.KnowledgeArticle
            .where({ tenantId, slug: data.slug })
            .select('id')
            .first();

        if (existing) {
          throw new ConflictException('Slug artikel sudah digunakan');
        }

        return tx.orm.public.KnowledgeArticle.create({
          title: data.title,
          slug: data.slug,
          content: data.content,
          summary: data.summary,
          createdBy: userId,
          tenantId,
        });
      },
    );
  }

  async findAll(
    userId: string,
    tenantId: string,
    query: {
      search?: string;
      tag?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    data: KnowledgeArticleResponse[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim().toLowerCase();
    const tag = query.tag?.trim().toLowerCase();

    let articles =
      await this.prisma.client.orm.public.KnowledgeArticle
        .where({
          tenantId,
          createdBy: userId,
        })
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

    if (search) {
      articles = articles.filter((article) =>
        [
          article.title,
          article.slug,
          article.content,
          article.summary ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(search),
      );
    }

    if (tag) {
      const tags =
        await this.prisma.client.orm.public.Tag
          .where({
            tenantId,
            name: tag,
          })
          .select('id')
          .first();

      if (!tags) {
        articles = [];
      } else {
        const taggedArticles =
          await this.prisma.client.orm.public.KnowledgeArticleTag
            .where({
              tagId: tags.id,
            })
            .select('articleId')
            .all();

        const ids = new Set(
          taggedArticles.map(
            (item) => item.articleId,
          ),
        );

        articles = articles.filter(
          (article) => ids.has(article.id),
        );
      }
    }

    const total = articles.length;
    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    const start = (page - 1) * limit;

    return {
      data: articles.slice(
        start,
        start + limit,
      ),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(
    userId: string,
    tenantId: string,
    id: string,
  ): Promise<KnowledgeArticleResponse> {
    const article =
      await this.prisma.client.orm.public.KnowledgeArticle
        .where({
          id,
          tenantId,
          createdBy: userId,
        })
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
      throw new NotFoundException(
        'Artikel knowledge tidak ditemukan',
      );
    }

    return article;
  }

  async update(
    userId: string,
    tenantId: string,
    id: string,
    data: UpdateKnowledgeArticleDto,
  ): Promise<KnowledgeArticleResponse> {
    const article =
      await this.prisma.client.orm.public.KnowledgeArticle
        .where({
          id,
          tenantId,
          createdBy: userId,
        })
        .select('id')
        .first();

    if (!article) {
      throw new NotFoundException(
        'Artikel knowledge tidak ditemukan',
      );
    }

    if (data.slug !== undefined) {
      const existing =
        await this.prisma.client.orm.public.KnowledgeArticle
          .where({
            tenantId,
            slug: data.slug,
          })
          .select('id')
          .first();

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Slug artikel sudah digunakan',
        );
      }
    }

    const updated =
      await this.prisma.client.orm.public.KnowledgeArticle
        .where({
          id,
          tenantId,
          createdBy: userId,
        })
        .update({
          title: data.title,
          slug: data.slug,
          content: data.content,
          summary: data.summary,
        });

    if (!updated) {
      throw new NotFoundException(
        'Artikel knowledge tidak ditemukan',
      );
    }

    return updated;
  }

  async remove(
    userId: string,
    tenantId: string,
    id: string,
  ): Promise<{ message: string }> {
    const article =
      await this.prisma.client.orm.public.KnowledgeArticle
        .where({
          id,
          tenantId,
          createdBy: userId,
        })
        .select('id')
        .first();

    if (!article) {
      throw new NotFoundException(
        'Artikel knowledge tidak ditemukan',
      );
    }

    await this.prisma.client.orm.public.KnowledgeArticle
      .where({
        id,
        tenantId,
        createdBy: userId,
      })
      .delete();

    return {
      message: 'Artikel knowledge berhasil dihapus',
    };
  }
}