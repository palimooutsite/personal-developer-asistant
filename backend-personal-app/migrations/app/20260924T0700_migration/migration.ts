#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/173b7b3d49d756ead318ad3e2ada6f1aa42ac801f70827bb7b9713ce2a9523ed/contract';
import startContract from '../../snapshots/173b7b3d49d756ead318ad3e2ada6f1aa42ac801f70827bb7b9713ce2a9523ed/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b96f86d6b04226943c1cc822c2755a56a448519be7240c160f09e8720ad6931b/contract';
import endContract from '../../snapshots/b96f86d6b04226943c1cc822c2755a56a448519be7240c160f09e8720ad6931b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'document',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdBy', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('filePath', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fileSize', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tenant',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdBy', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tenantMember',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'tenantMember_role_check_50a44636',
            "\"role\" IN ('OWNER', 'ADMIN', 'MEMBER')",
          ),
        ],
      }),
      this.setDefault({
        schema: 'public',
        table: 'project',
        column: 'status',
        defaultSql: "DEFAULT 'PLANNED'",
      }),
      this.addUnique({
        schema: 'public',
        table: 'tenantMember',
        constraint: 'tenantMember_tenantId_userId_key',
        columns: ['tenantId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_createdBy_idx_ba0f792f',
        columns: ['createdBy'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenant',
        index: 'tenant_createdBy_idx_ba0f792f',
        columns: ['createdBy'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenantMember',
        index: 'tenantMember_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenantMember',
        index: 'tenantMember_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_createdBy_fkey',
          columns: ['createdBy'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenant',
        foreignKey: {
          name: 'tenant_createdBy_fkey',
          columns: ['createdBy'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenantMember',
        foreignKey: {
          name: 'tenantMember_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenantMember',
        foreignKey: {
          name: 'tenantMember_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
