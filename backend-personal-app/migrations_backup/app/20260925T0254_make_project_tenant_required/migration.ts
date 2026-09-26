#!/usr/bin/env -S node

import type { Contract as Start } from '../../snapshots/2f631ea1a0315e4e5ef8f876704f758c7890a9daf6e9e4f2be2ae455c87f3394/contract';
import startContract from '../../snapshots/2f631ea1a0315e4e5ef8f876704f758c7890a9daf6e9e4f2be2ae455c87f3394/contract.json' with { type: 'json' };

import type { Contract as End } from '../../snapshots/b82e9c50b4bd4b0f6b33bdb7dc1b50df29a3bf98e2df387ad4987f4d3fcccb73/contract';
import endContract from '../../snapshots/b82e9c50b4bd4b0f6b33bdb7dc1b50df29a3bf98e2df387ad4987f4d3fcccb73/contract.json' with { type: 'json' };

import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setNotNull({
        schema: 'public',
        table: 'project',
        column: 'tenantId',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);