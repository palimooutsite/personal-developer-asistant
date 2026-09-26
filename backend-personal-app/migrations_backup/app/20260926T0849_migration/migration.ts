#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/44cc6b4d1e757d9746e9b6e942d48e86a8c43dfcafb89a62360554649cf560fe/contract';
import startContract from '../../snapshots/44cc6b4d1e757d9746e9b6e942d48e86a8c43dfcafb89a62360554649cf560fe/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/73923a610bcb6c3b4bcfb1829c19d42b160a5f0ae41ba69d09df19d78c80bba4/contract';
import endContract from '../../snapshots/73923a610bcb6c3b4bcfb1829c19d42b160a5f0ae41ba69d09df19d78c80bba4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, placeholder } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'codeSnippet',
        column: col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-codeSnippet-tenantId', {
        check: () => placeholder('backfill-codeSnippet-tenantId:check'),
        run: () => placeholder('backfill-codeSnippet-tenantId:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'codeSnippet', column: 'tenantId' }),
      this.addColumn({
        schema: 'public',
        table: 'document',
        column: col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-document-tenantId', {
        check: () => placeholder('backfill-document-tenantId:check'),
        run: () => placeholder('backfill-document-tenantId:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'document', column: 'tenantId' }),
      this.createIndex({
        schema: 'public',
        table: 'codeSnippet',
        index: 'codeSnippet_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'codeSnippet',
        foreignKey: {
          name: 'codeSnippet_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
