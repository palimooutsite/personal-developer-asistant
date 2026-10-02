# Billing concurrency integration tests

These tests require a dedicated PostgreSQL database. They intentionally refuse to run unless
`BILLING_TEST_DATABASE_URL` is set and the database name contains `test`.

## Start the isolated PostgreSQL instance

From the repository root:

```bash
docker compose -f docker-compose.billing-test.yml up -d
```

The test database is exposed on host port `55433` and is separate from the development database.

## Configure the backend

PowerShell:

```powershell
$env:BILLING_TEST_DATABASE_URL="postgresql://pda_test_user:pda_test_password@localhost:55433/personal_developer_billing_test"
```

## Prepare the schema

From `backend-personal-app`:

```bash
pnpm test:billing:db
```

This runs the project's Prisma 8 `db update` workflow against the explicitly supplied test URL.

## Run the suite

```bash
pnpm test:billing
```

The suite covers:

1. concurrent checkout-session success -> one billing result;
2. concurrent payment success -> idempotent result;
3. payment success vs failure -> mutually exclusive final state;
4. one-use discount -> cannot be consumed twice by concurrent checkout;
5. concurrent subscription creation -> only one active-ish subscription.

The fourth and fifth tests are expected to expose the remaining race conditions found during the Phase 3A audit. They are deliberately integration tests rather than mocked unit tests.
