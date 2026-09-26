#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/173b7b3d49d756ead318ad3e2ada6f1aa42ac801f70827bb7b9713ce2a9523ed/contract';
import startContract from '../../snapshots/173b7b3d49d756ead318ad3e2ada6f1aa42ac801f70827bb7b9713ce2a9523ed/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/782667759674a93826585b216c7198cc80bdb3f0df2c31cc19e105589c11c66f/contract';
import endContract from '../../snapshots/782667759674a93826585b216c7198cc80bdb3f0df2c31cc19e105589c11c66f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setDefault({
        schema: 'public',
        table: 'project',
        column: 'status',
        defaultSql: "DEFAULT 'PLANNED'",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
