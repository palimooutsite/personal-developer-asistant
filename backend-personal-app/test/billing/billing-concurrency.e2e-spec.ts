import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { BillingModule } from '../../src/billing/billing.module.js';
import { BillingCheckoutSessionService } from '../../src/billing/checkout-session.service.js';
import { BillingCheckoutSessionProviderDto } from '../../src/billing/dto/create-checkout-session.dto.js';
import { BillingSubscriptionService } from '../../src/billing/subscription.service.js';
import { BillingSubscriptionProviderDto } from '../../src/billing/dto/create-subscription.dto.js';
import { BillingPaymentService } from '../../src/billing/payment.service.js';
import { BillingInvoiceService } from '../../src/billing/invoice.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

const TEST_DATABASE_URL = process.env.BILLING_TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error(
    'BILLING_TEST_DATABASE_URL is required. Refusing to run billing integration tests without an explicit isolated database.',
  );
}

const testDatabaseName = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, '');
if (!testDatabaseName.toLowerCase().includes('test')) {
  throw new Error(
    `Refusing to run billing integration tests against database "${testDatabaseName}". Database name must contain "test".`,
  );
}

describe.sequential('Billing concurrency integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let checkoutSessions: BillingCheckoutSessionService;
  let subscriptions: BillingSubscriptionService;
  let payments: BillingPaymentService;
  let invoices: BillingInvoiceService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    checkoutSessions = moduleRef.get(BillingCheckoutSessionService);
    subscriptions = moduleRef.get(BillingSubscriptionService);
    payments = moduleRef.get(BillingPaymentService);
    invoices = moduleRef.get(BillingInvoiceService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  async function seedUser() {
    const suffix = randomUUID().replaceAll('-', '');
    return prisma.client.orm.public.User.create({
      username: `billing_test_${suffix}`,
      email: `billing_test_${suffix}@example.test`,
      passwordHash: 'billing-test-password-hash',
      name: 'Billing Integration Test',
    });
  }

  async function seedPackage() {
    const suffix = randomUUID().replaceAll('-', '');
    const pkg = await prisma.client.orm.public.SubscriptionPackage.create({
      code: `TEST_${suffix}`,
      name: 'Billing Test Package',
      description: 'Ephemeral package for billing integration tests',
      isActive: true,
      sortOrder: 999,
    });

    const price = await prisma.client.orm.public.SubscriptionPackagePrice.create({
      packageId: pkg.id,
      version: 1,
      billingPeriod: 'MONTHLY',
      amountMinor: 99000,
      currency: 'IDR',
      isActive: true,
    });

    return { pkg, price };
  }

  async function seedTenantWithMember(userId: string, packageId: string, packagePriceId: string) {
    const tenant = await prisma.client.orm.public.Tenant.create({
      name: `Billing Test Workspace ${randomUUID().slice(0, 8)}`,
      createdBy: userId,
    });

    const role = await prisma.client.orm.public.TenantCustomRole.create({
      tenantId: tenant.id,
      name: 'Owner',
      description: 'Billing test owner role',
      isSystem: true,
    });

    await prisma.client.orm.public.TenantMember.create({
      tenantId: tenant.id,
      userId,
      role: 'OWNER',
      roleId: role.id,
    });

    return { tenant, role, packageId, packagePriceId };
  }

  async function seedPendingPayment(userId: string) {
    const { pkg, price } = await seedPackage();
    const { tenant } = await seedTenantWithMember(userId, pkg.id, price.id);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await prisma.client.orm.public.TenantSubscription.create({
      tenantId: tenant.id,
      packageId: pkg.id,
      packagePriceId: price.id,
      status: 'PENDING',
      provider: 'SANDBOX',
      startedAt: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    const invoice = await prisma.client.orm.public.SubscriptionInvoice.create({
      tenantId: tenant.id,
      subscriptionId: subscription.id,
      packagePriceId: price.id,
      packageCode: pkg.code,
      packageName: pkg.name,
      billingPeriod: 'MONTHLY',
      currency: 'IDR',
      originalAmountMinor: price.amountMinor,
      discountAmountMinor: 0,
      taxAmountMinor: 0,
      finalAmountMinor: price.amountMinor,
      status: 'PENDING',
      issuedAt: now.toISOString(),
      dueAt: new Date(now.getTime() + 86400000).toISOString(),
    });

    const payment = await prisma.client.orm.public.Payment.create({
      tenantId: tenant.id,
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      provider: 'SANDBOX',
      providerPaymentId: `TEST-PAYMENT-${randomUUID()}`,
      status: 'PENDING',
      amountMinor: invoice.finalAmountMinor,
      currency: 'IDR',
      checkoutUrl: `sandbox://payment/${invoice.id}`,
      expiresAt: new Date(now.getTime() + 86400000).toISOString(),
    });

    return { userId, tenant, pkg, price, subscription, invoice, payment };
  }

  it('makes concurrent checkout-session succeed calls converge to one billing result', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();

    const session = await checkoutSessions.create(user.id, {
      packageId: pkg.id,
      packagePriceId: price.id,
      workspaceName: 'Concurrent Checkout Workspace',
      provider: BillingCheckoutSessionProviderDto.SANDBOX,
    });

    const results = await Promise.allSettled([
      checkoutSessions.sandboxSucceed(user.id, session.id),
      checkoutSessions.sandboxSucceed(user.id, session.id),
    ]);

    const fulfilled = results.filter(
      (item): item is PromiseFulfilledResult<Awaited<ReturnType<BillingCheckoutSessionService['sandboxSucceed']>>> =>
        item.status === 'fulfilled',
    );

    expect(fulfilled.length).toBe(2);
    expect(new Set(fulfilled.map((item) => item.value.paymentId)).size).toBe(1);
    expect(new Set(fulfilled.map((item) => item.value.tenantId)).size).toBe(1);

    const payments = await prisma.client.orm.public.Payment
      .where({ providerPaymentId: `SANDBOX-SESSION-${session.id}` })
      .all();
    expect(payments).toHaveLength(1);

    const tenants = await prisma.client.orm.public.Tenant
      .where({ id: fulfilled[0].value.tenantId })
      .all();
    expect(tenants).toHaveLength(1);
  });

  it('makes concurrent payment succeed calls idempotent', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    const results = await Promise.allSettled([
      payments.sandboxSucceed(fixture.tenant.id, user.id, fixture.payment.id),
      payments.sandboxSucceed(fixture.tenant.id, user.id, fixture.payment.id),
    ]);

    const fulfilled = results.filter(
      (item): item is PromiseFulfilledResult<Awaited<ReturnType<BillingPaymentService['sandboxSucceed']>>> =>
        item.status === 'fulfilled',
    );

    expect(fulfilled.length).toBe(2);
    expect(new Set(fulfilled.map((item) => item.value.status)).size).toBe(1);

    const payment = await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .first();
    const invoice = await prisma.client.orm.public.SubscriptionInvoice
      .where({ id: fixture.invoice.id })
      .first();
    const subscription = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();

    expect(payment?.status).toBe('SUCCEEDED');
    expect(invoice?.status).toBe('SUCCEEDED');
    expect(subscription?.status).toBe('ACTIVE');
  });

  it('keeps payment succeed-vs-fail transitions mutually exclusive', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    const results = await Promise.allSettled([
      payments.sandboxSucceed(fixture.tenant.id, user.id, fixture.payment.id),
      payments.sandboxFail(fixture.tenant.id, user.id, fixture.payment.id),
    ]);

    const payment = await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .first();
    const invoice = await prisma.client.orm.public.SubscriptionInvoice
      .where({ id: fixture.invoice.id })
      .first();
    const subscription = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();

    expect(payment).toBeTruthy();
    expect(['SUCCEEDED', 'FAILED']).toContain(payment?.status);

    if (payment?.status === 'SUCCEEDED') {
      expect(invoice?.status).toBe('SUCCEEDED');
      expect(subscription?.status).toBe('ACTIVE');
    }

    if (payment?.status === 'FAILED') {
      expect(invoice?.status).toBe('PENDING');
      expect(subscription?.status).toBe('PENDING');
    }

    expect(results.some((item) => item.status === 'fulfilled')).toBe(true);
  });

  it('does not allow a one-use discount to be consumed twice by concurrent invoices', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);
    const suffix = randomUUID().replaceAll('-', '');

    const discount = await prisma.client.orm.public.Discount.create({
      code: `TEST_ONCE_${suffix}`.toUpperCase(),
      name: 'Concurrent once discount',
      description: 'Ephemeral concurrency test discount',
      type: 'PERCENTAGE',
      percentage: 10,
      duration: 'ONCE',
      usageLimit: 10,
      usageCount: 0,
      isActive: true,
    });

    await prisma.client.orm.public.DiscountPackage.create({
      discountId: discount.id,
      packageId: fixture.pkg.id,
    });

    const results = await Promise.allSettled([
      invoices.create(fixture.tenant.id, user.id, {
        discountCode: discount.code,
      }),
      invoices.create(fixture.tenant.id, user.id, {
        discountCode: discount.code,
      }),
    ]);

    if (results.some((item) => item.status === 'rejected')) console.error('DISCOUNT', results.map((item) => item.status === 'rejected' ? (item.reason instanceof Error ? item.reason.stack : item.reason) : 'fulfilled'));

    const succeeded = results.filter((item) => item.status === 'fulfilled');
    const usages = await prisma.client.orm.public.DiscountUsage
      .where({ discountId: discount.id, tenantId: fixture.tenant.id })
      .all();

    expect(succeeded.length).toBe(1);
    expect(usages).toHaveLength(1);
  });

  it('does not create two active-ish subscriptions when creation races', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(user.id, pkg.id, price.id);

    const results = await Promise.allSettled([
      subscriptions.create(fixture.tenant.id, user.id, {
        packageId: pkg.id,
        packagePriceId: price.id,
        provider: BillingSubscriptionProviderDto.SANDBOX,
      }),
      subscriptions.create(fixture.tenant.id, user.id, {
        packageId: pkg.id,
        packagePriceId: price.id,
        provider: BillingSubscriptionProviderDto.SANDBOX,
      }),
    ]);

    if (results.some((item) => item.status === 'rejected')) console.error('SUBSCRIPTION', results.map((item) => item.status === 'rejected' ? (item.reason instanceof Error ? item.reason.stack : item.reason) : 'fulfilled'));

    const subscriptionsInDb = await prisma.client.orm.public.TenantSubscription
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(
      subscriptionsInDb.filter((item) =>
        ['PENDING', 'TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)),
      ),
    ).toHaveLength(1);

    expect(
      results.filter((item) => item.status === 'fulfilled'),
    ).toHaveLength(1);
  });
});
