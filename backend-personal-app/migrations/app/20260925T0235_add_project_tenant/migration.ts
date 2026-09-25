#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2f631ea1a0315e4e5ef8f876704f758c7890a9daf6e9e4f2be2ae455c87f3394/contract';
import endContract from '../../snapshots/2f631ea1a0315e4e5ef8f876704f758c7890a9daf6e9e4f2be2ae455c87f3394/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b96f86d6b04226943c1cc822c2755a56a448519be7240c160f09e8720ad6931b/contract';
import startContract from '../../snapshots/b96f86d6b04226943c1cc822c2755a56a448519be7240c160f09e8720ad6931b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'project',
        column: col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'project',
        index: 'project_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'project',
        foreignKey: {
          name: 'project_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
