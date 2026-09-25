import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { AddArticleTagDto } from './dto/add-article-tag.dto.js';

export interface ArticleTagResponse {
  id: string;
  articleId: string;
  tagId: string;
  tag: {
    id: string;
    name: string;
  };
  createdAt: string;
}

@Injectable()
export class ArticleTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    tenantId: string,
    articleId: string,
  ): Promise<ArticleTagResponse[]> {
    await this.requireArticle(
      userId,
      tenantId,
      articleId,
    );

    const articleTags =
      await this.prisma.client.orm.public.KnowledgeArticleTag
        .where({ articleId })
        .select(
          'id',
          'articleId',
          'tagId',
          'createdAt',
        )
        .all();

    const result: ArticleTagResponse[] = [];

    for (const articleTag of articleTags) {
      const tag =
        await this.prisma.client.orm.public.Tag
          .where({
            id: articleTag.tagId,
            tenantId,
          })
          .select('id', 'name')
          .first();

      if (!tag) {
        continue;
      }

      result.push({
        id: articleTag.id,
        articleId: articleTag.articleId,
        tagId: articleTag.tagId,
        tag,
        createdAt: articleTag.createdAt,
      });
    }

    return result;
  }

  async add(
    userId: string,
    tenantId: string,
    articleId: string,
    data: AddArticleTagDto,
  ): Promise<ArticleTagResponse> {
    await this.requireArticle(
      userId,
      tenantId,
      articleId,
    );

    const tag =
      await this.prisma.client.orm.public.Tag
        .where({
          id: data.tagId,
          tenantId,
        })
        .select('id', 'name')
        .first();

    if (!tag) {
      throw new NotFoundException(
        'Tag tidak ditemukan',
      );
    }

    const existing =
      await this.prisma.client.orm.public.KnowledgeArticleTag
        .where({
          articleId,
          tagId: data.tagId,
        })
        .select('id')
        .first();

    if (existing) {
      throw new ConflictException(
        'Tag sudah terpasang pada artikel',
      );
    }

    const articleTag =
      await this.prisma.client.orm.public.KnowledgeArticleTag.create({
        articleId,
        tagId: data.tagId,
      });

    return {
      id: articleTag.id,
      articleId: articleTag.articleId,
      tagId: articleTag.tagId,
      tag,
      createdAt: articleTag.createdAt,
    };
  }

  async remove(
    userId: string,
    tenantId: string,
    articleId: string,
    tagId: string,
  ): Promise<{ message: string }> {
    await this.requireArticle(
      userId,
      tenantId,
      articleId,
    );

    const tag =
      await this.prisma.client.orm.public.Tag
        .where({
          id: tagId,
          tenantId,
        })
        .select('id')
        .first();

    if (!tag) {
      throw new NotFoundException(
        'Tag tidak ditemukan',
      );
    }

    const articleTag =
      await this.prisma.client.orm.public.KnowledgeArticleTag
        .where({
          articleId,
          tagId,
        })
        .select('id')
        .first();

    if (!articleTag) {
      throw new NotFoundException(
        'Tag tidak terpasang pada artikel',
      );
    }

    await this.prisma.client.orm.public.KnowledgeArticleTag
      .where({
        articleId,
        tagId,
      })
      .delete();

    return {
      message: 'Tag berhasil dilepas dari artikel',
    };
  }

  private async requireArticle(
    userId: string,
    tenantId: string,
    articleId: string,
  ) {
    const article =
      await this.prisma.client.orm.public.KnowledgeArticle
        .where({
          id: articleId,
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

    return article;
  }
}