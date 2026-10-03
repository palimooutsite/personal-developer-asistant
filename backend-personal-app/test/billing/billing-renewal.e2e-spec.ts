import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { BillingModule } from '../../src/billing/billing.module.js';
import { BillingRenewalService } from '../../src/billing/renewal.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { EmailService } from '../../src/email/email.service.js';
import { PermissionGuard } from '../../src/tenants/roles/permission.guard.js';

const TEST_DATABASE_URL = process.env.BILLING_TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('BILLING_TEST_DATABASE_URL is required.');
}

const testDatabaseName = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, '');
if (!testDatabaseName.toLowerCase().includes('test')) {
  throw new Error(`Refusing to run against database "${testDatabaseName}".`);
}

describe.sequential('Billing renewal integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let renewal: BillingRenewalService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [BillingModule],
    })
      .overrideProvider(EmailService)
      .useValue({ sendTenantInvitation: async () => undefined })
      .overrideProvider(PermissionGuard)
      .useValue({ canActivate: async () => true })
      .compile();

    prisma = moduleRef.get(PrismaService);
    renewal = moduleRef.get(BillingRenewalService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  async function seedSubscription(
    status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' = 'ACTIVE',
    billingPeriod: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
    periodEnd = new Date(Date.now() - 60_000),
  ) {
    const suffix = randomUUID().replaceAll('-', '');
    const user = await prisma.client.orm.public.User.create({
      username: `renewal_test_${suffix}`,
      email: `renewal_test_${suffix}@example.test`,
      passwordHash: 'renewal-test-password-hash',
      name: 'Renewal Integration Test',
    });

    const pkg = await prisma.client.orm.public.SubscriptionPackage.create({
      code: `RENEWAL_${suffix}`,
      name: 'Renewal Test Package',
      isActive: true,
      sortOrder: 999,
    });

    const price = await prisma.client.orm.public.SubscriptionPackagePrice.create({
      packageId: pkg.id,
      version: 1,
      billingPeriod,
      amountMinor: 99000,
      currency: 'IDR',
      isActive: true,
    });

    const tenant = await prisma.client.orm.public.Tenant.create({
      name: `Renewal Workspace ${suffix.slice(0, 8)}`,
      createdBy: user.id,
    });

    const role = await prisma.client.orm.public.TenantCustomRole.create({
      tenantId: tenant.id,
      name: 'Owner',
      isSystem: true,
    });

    await prisma.client.orm.public.TenantMember.create({
      tenantId: tenant.id,
      userId: user.id,
      role: 'OWNER',
      roleId: role.id,
    });

    const periodStart = new Date(periodEnd);
    if (billingPeriod === 'MONTHLY') {
      periodStart.setMonth(periodStart.getMonth() - 1);
    } else {
      periodStart.setFullYear(periodStart.getFullYear() - 1);
    }

    const subscription = await prisma.client.orm.public.TenantSubscription.create({
      tenantId: tenant.id,
      packageId: pkg.id,
      packagePriceId: price.id,
      status,
      provider: 'SANDBOX',
      startedAt: periodStart.toISOString(),
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    return { user, tenant, pkg, price, subscription, periodStart, periodEnd };
  }

  it('mengubah ACTIVE menjadi PAST_DUE tepat setelah period berakhir', async () => {
    const fixture = await seedSubscription('ACTIVE');
    const now = new Date(fixture.periodEnd.getTime() + 1);

    const result = await renewal.processDue(fixture.subscription.id, now);

    expect(result.status).toBe('PAST_DUE');

    const persisted = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();
    expect(persisted?.status).toBe('PAST_DUE');
  });

  it('mengubah TRIAL menjadi PAST_DUE saat period berakhir', async () => {
    const fixture = await seedSubscription('TRIAL');
    const result = await renewal.processDue(
      fixture.subscription.id,
      new Date(fixture.periodEnd.getTime() + 1),
    );

    expect(result.status).toBe('PAST_DUE');
  });

  it('tetap PAST_DUE selama masih dalam grace period 3 hari', async () => {
    const fixture = await seedSubscription(
      'PAST_DUE',
      'MONTHLY',
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    );

    const result = await renewal.processDue(
      fixture.subscription.id,
      new Date(fixture.periodEnd.getTime() + 1),
    );

    expect(result.status).toBe('PAST_DUE');
  });

  it('mengubah PAST_DUE menjadi EXPIRED setelah grace period 3 hari terlewati', async () => {
    const fixture = await seedSubscription(
      'PAST_DUE',
      'MONTHLY',
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    );

    const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
    const now = new Date(fixture.periodEnd.getTime() + gracePeriodMs + 1);

    const result = await renewal.processDue(
      fixture.subscription.id,
      now,
    );

    expect(result.status).toBe('EXPIRED');

    const persisted = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();
    expect(persisted?.status).toBe('EXPIRED');
  });

  it('tidak mengubah EXPIRED kembali menjadi PAST_DUE', async () => {
    const fixture = await seedSubscription('EXPIRED');

    const result = await renewal.processDue(
      fixture.subscription.id,
      new Date(),
    );

    expect(result.status).toBe('EXPIRED');
  });

  it('tidak mengubah CANCELLED melalui proses renewal', async () => {
    const fixture = await seedSubscription('CANCELLED');

    const result = await renewal.processDue(
      fixture.subscription.id,
      new Date(),
    );

    expect(result.status).toBe('CANCELLED');
  });

  it('tidak mengubah subscription yang periodenya belum berakhir', async () => {
    const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const fixture = await seedSubscription('ACTIVE', 'MONTHLY', periodEnd);

    const result = await renewal.processDue(
      fixture.subscription.id,
      new Date(),
    );

    expect(result.status).toBe('ACTIVE');
  });

  it('memproses renewal due secara idempotent saat dipanggil bersamaan', async () => {
    const fixture = await seedSubscription('ACTIVE');

    const results = await Promise.all([
      renewal.processDue(fixture.subscription.id, new Date(fixture.periodEnd.getTime() + 1)),
      renewal.processDue(fixture.subscription.id, new Date(fixture.periodEnd.getTime() + 1)),
    ]);

    expect(results.map((item) => item.status)).toEqual(['PAST_DUE', 'PAST_DUE']);

    const persisted = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();
    expect(persisted?.status).toBe('PAST_DUE');
  });

  it('tidak mengubah PENDING menjadi PAST_DUE', async () => {
    const suffix = randomUUID().replaceAll('-', '');
    const user = await prisma.client.orm.public.User.create({
      username: `renewal_pending_${suffix}`,
      email: `renewal_pending_${suffix}@example.test`,
      passwordHash: 'renewal-test-password-hash',
    });
    const pkg = await prisma.client.orm.public.SubscriptionPackage.create({
      code: `RENEWAL_PENDING_${suffix}`,
      name: 'Renewal Pending Package',
      isActive: true,
    });
    const price = await prisma.client.orm.public.SubscriptionPackagePrice.create({
      packageId: pkg.id,
      version: 1,
      billingPeriod: 'MONTHLY',
      amountMinor: 99000,
      currency: 'IDR',
      isActive: true,
    });
    const tenant = await prisma.client.orm.public.Tenant.create({
      name: 'Renewal Pending Workspace',
      createdBy: user.id,
    });
    const subscription = await prisma.client.orm.public.TenantSubscription.create({
      tenantId: tenant.id,
      packageId: pkg.id,
      packagePriceId: price.id,
      status: 'PENDING',
      provider: 'SANDBOX',
      startedAt: new Date(Date.now() - 86400000 * 31).toISOString(),
      currentPeriodStart: new Date(Date.now() - 86400000 * 31).toISOString(),
      currentPeriodEnd: new Date(Date.now() - 86400000).toISOString(),
    });

    const result = await renewal.processDue(subscription.id, new Date());

    expect(result.status).toBe('PENDING');
  });
});
