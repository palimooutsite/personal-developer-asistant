#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/44cc6b4d1e757d9746e9b6e942d48e86a8c43dfcafb89a62360554649cf560fe/contract';
import endContract from '../../snapshots/44cc6b4d1e757d9746e9b6e942d48e86a8c43dfcafb89a62360554649cf560fe/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b82e9c50b4bd4b0f6b33bdb7dc1b50df29a3bf98e2df387ad4987f4d3fcccb73/contract';
import startContract from '../../snapshots/b82e9c50b4bd4b0f6b33bdb7dc1b50df29a3bf98e2df387ad4987f4d3fcccb73/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, placeholder } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'knowledgeArticle',
        constraint: 'knowledgeArticle_slug_key',
      }),
      this.dropConstraint({ schema: 'public', table: 'tag', constraint: 'tag_name_key' }),
      this.addColumn({
        schema: 'public',
        table: 'knowledgeArticle',
        column: col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      
      this.setNotNull({ schema: 'public', table: 'knowledgeArticle', column: 'tenantId' }),
      this.addColumn({
        schema: 'public',
        table: 'tag',
        column: col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
     
      this.setNotNull({ schema: 'public', table: 'tag', column: 'tenantId' }),
      this.addUnique({
        schema: 'public',
        table: 'knowledgeArticle',
        constraint: 'knowledgeArticle_tenantId_slug_key',
        columns: ['tenantId', 'slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tag',
        constraint: 'tag_tenantId_name_key',
        columns: ['tenantId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'knowledgeArticle',
        index: 'knowledgeArticle_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tag',
        index: 'tag_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'knowledgeArticle',
        foreignKey: {
          name: 'knowledgeArticle_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tag',
        foreignKey: {
          name: 'tag_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
