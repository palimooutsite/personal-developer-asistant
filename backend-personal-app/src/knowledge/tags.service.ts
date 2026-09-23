import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';

export interface TagResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTagDto): Promise<TagResponse> {
    const name = data.name.trim();

    const existing = await this.prisma.client.orm.public.Tag
      .where({ name })
      .select('id')
      .first();

    if (existing) {
      throw new ConflictException('Tag sudah digunakan');
    }

    return this.prisma.client.orm.public.Tag.create({ name });
  }

  async findAll(): Promise<TagResponse[]> {
    return this.prisma.client.orm.public.Tag
      .select('id', 'name', 'createdAt', 'updatedAt')
      .all();
  }

  async findOne(id: string): Promise<TagResponse> {
    const tag = await this.prisma.client.orm.public.Tag
      .where({ id })
      .select('id', 'name', 'createdAt', 'updatedAt')
      .first();

    if (!tag) {
      throw new NotFoundException('Tag tidak ditemukan');
    }

    return tag;
  }

  async update(id: string, data: UpdateTagDto): Promise<TagResponse> {
    const tag = await this.findOne(id);
    const name = data.name.trim();

    const existing = await this.prisma.client.orm.public.Tag
      .where({ name })
      .select('id')
      .first();

    if (existing && existing.id !== tag.id) {
      throw new ConflictException('Tag sudah digunakan');
    }

    const updated = await this.prisma.client.orm.public.Tag
      .where({ id })
      .update({ name });

    if (!updated) {
      throw new NotFoundException('Tag tidak ditemukan');
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    const usage = await this.prisma.client.orm.public.KnowledgeArticleTag
      .where({ tagId: id })
      .select('id')
      .first();

    if (usage) {
      throw new ConflictException(
        'Tag masih digunakan oleh knowledge article',
      );
    }

    const snippetUsage = await this.prisma.client.orm.public.SnippetTag
      .where({ tagId: id })
      .select('id')
      .first();

    if (snippetUsage) {
      throw new ConflictException(
        'Tag masih digunakan oleh code snippet',
      );
    }

    await this.prisma.client.orm.public.Tag.where({ id }).delete();

    return { message: 'Tag berhasil dihapus' };
  }
}
