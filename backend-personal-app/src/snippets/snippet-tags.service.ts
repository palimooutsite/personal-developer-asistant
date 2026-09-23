import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddSnippetTagDto } from './dto/add-snippet-tag.dto.js';

export interface SnippetTagResponse {
  id: string;
  snippetId: string;
  tagId: string;
  tag: { id: string; name: string };
  createdAt: string;
}

@Injectable()
export class SnippetTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, snippetId: string): Promise<SnippetTagResponse[]> {
    await this.requireSnippet(userId, snippetId);
    const rows = await this.prisma.client.orm.public.SnippetTag
      .where({ snippetId })
      .select('id', 'snippetId', 'tagId', 'createdAt')
      .all();

    const result: SnippetTagResponse[] = [];
    for (const row of rows) {
      const tag = await this.prisma.client.orm.public.Tag.where({ id: row.tagId }).select('id', 'name').first();
      if (tag) result.push({ ...row, tag });
    }
    return result;
  }

  async add(userId: string, snippetId: string, data: AddSnippetTagDto): Promise<SnippetTagResponse> {
    await this.requireSnippet(userId, snippetId);

    const tag = await this.prisma.client.orm.public.Tag.where({ id: data.tagId }).select('id', 'name').first();
    if (!tag) throw new NotFoundException('Tag tidak ditemukan');

    const existing = await this.prisma.client.orm.public.SnippetTag
      .where({ snippetId, tagId: data.tagId }).select('id').first();
    if (existing) throw new ConflictException('Tag sudah terpasang pada code snippet');

    const row = await this.prisma.client.orm.public.SnippetTag.create({ snippetId, tagId: data.tagId });
    return { ...row, tag };
  }

  async remove(userId: string, snippetId: string, tagId: string): Promise<{ message: string }> {
    await this.requireSnippet(userId, snippetId);
    const row = await this.prisma.client.orm.public.SnippetTag.where({ snippetId, tagId }).select('id').first();
    if (!row) throw new NotFoundException('Tag tidak terpasang pada code snippet');

    await this.prisma.client.orm.public.SnippetTag.where({ snippetId, tagId }).delete();
    return { message: 'Tag berhasil dilepas dari code snippet' };
  }

  private async requireSnippet(userId: string, snippetId: string) {
    const snippet = await this.prisma.client.orm.public.CodeSnippet
      .where({ id: snippetId, createdBy: userId }).select('id').first();
    if (!snippet) throw new NotFoundException('Code snippet tidak ditemukan');
    return snippet;
  }
}
