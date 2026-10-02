import { spawnSync } from 'node:child_process';

const url = process.env.BILLING_TEST_DATABASE_URL;

if (!url) {
  console.error('BILLING_TEST_DATABASE_URL is required.');
  process.exit(1);
}

const databaseName = new URL(url).pathname.replace(/^\//, '');
if (!databaseName.toLowerCase().includes('test')) {
  console.error('Refusing to prepare a database whose name does not contain "test".');
  console.error('Received database:', databaseName);
  process.exit(1);
}

const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['prisma', 'db', 'update'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: url,
    },
  },
);

process.exit(result.status ?? 1);
