import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { BillingModule } from '../../src/billing/billing.module.js';
import { BillingCheckoutSessionService } from '../../src/billing/checkout-session.service.js';
import { BillingCheckoutSessionProviderDto } from '../../src/billing/dto/create-checkout-session.dto.js';
import { BillingSubscriptionService } from '../../src/billing/subscription.service.js';
import { BillingSubscriptionProviderDto } from '../../src/billing/dto/create-subscription.dto.js';
import { BillingPaymentService } from '../../src/billing/payment.service.js';
import { BillingPaymentProviderDto } from '../../src/billing/dto/create-payment.dto.js';
import { BillingInvoiceService } from '../../src/billing/invoice.service.js';
import { BillingDiscountService } from '../../src/billing/discount.service.js';
import { BillingDiscountTypeDto } from '../../src/billing/dto/create-discount.dto.js';
import { ProjectsService } from '../../src/projects/projects.service.js';
import { BillingFeatureService } from '../../src/billing/feature.service.js';
import { BillingCatalogService } from '../../src/billing/catalog.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { TenantService } from '../../src/tenants/tenant.service.js';
import { EmailService } from '../../src/email/email.service.js';
import { PermissionGuard } from '../../src/tenants/roles/permission.guard.js';

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
  let discounts: BillingDiscountService;
  let projects: ProjectsService;
  let catalog: BillingCatalogService;
  let tenants: TenantService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [BillingModule],
      providers: [ProjectsService, BillingFeatureService],
    })
      .overrideProvider(EmailService)
      .useValue({ sendTenantInvitation: async () => undefined })
      .overrideProvider(PermissionGuard)
      .useValue({ canActivate: async () => true })
      .compile();

    prisma = moduleRef.get(PrismaService);
    checkoutSessions = moduleRef.get(BillingCheckoutSessionService);
    subscriptions = moduleRef.get(BillingSubscriptionService);
    payments = moduleRef.get(BillingPaymentService);
    invoices = moduleRef.get(BillingInvoiceService);
    discounts = moduleRef.get(BillingDiscountService);
    projects = moduleRef.get(ProjectsService);
    catalog = moduleRef.get(BillingCatalogService);
    tenants = moduleRef.get(TenantService);
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

  async function seedMemberCapacityFixture(limitValue: number) {
    const owner = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(owner.id, pkg.id, price.id);

    const feature = await prisma.client.orm.public.SubscriptionFeature
      .where({ code: 'WORKSPACE_MEMBER' })
      .first();

    const memberFeature = feature ?? await prisma.client.orm.public.SubscriptionFeature.create({
      code: 'WORKSPACE_MEMBER',
      name: 'Workspace Member limit test',
      valueType: 'LIMIT',
      isActive: true,
    });

    await prisma.client.orm.public.SubscriptionPackageFeature.create({
      packageId: pkg.id,
      featureId: memberFeature.id,
      enabled: true,
      limitValue,
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.client.orm.public.TenantSubscription.create({
      tenantId: fixture.tenant.id,
      packageId: pkg.id,
      packagePriceId: price.id,
      status: 'ACTIVE',
      provider: 'SANDBOX',
      startedAt: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    const role = await prisma.client.orm.public.TenantCustomRole.create({
      tenantId: fixture.tenant.id,
      name: 'Member Test Role',
      description: 'Concurrency test role',
      isSystem: false,
    });

    await prisma.client.orm.public.TenantRolePermission.create({
      roleId: fixture.role.id,
      module: 'WORKSPACE_MEMBERS',
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    });

    return { owner, ...fixture, memberFeature, role };
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

  it('does not complete an expired checkout session after the lifecycle race', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();

    const session = await checkoutSessions.create(user.id, {
      packageId: pkg.id,
      packagePriceId: price.id,
      workspaceName: 'Expired Checkout Workspace',
      provider: BillingCheckoutSessionProviderDto.SANDBOX,
    });

    await prisma.client.orm.public.BillingCheckoutSession
      .where({ id: session.id })
      .update({ expiresAt: new Date(Date.now() - 1000).toISOString() });

    await expect(
      checkoutSessions.sandboxSucceed(user.id, session.id),
    ).rejects.toMatchObject({
      response: {
        message: 'Checkout session sudah kedaluwarsa',
      },
    });

    const persistedSession = await prisma.client.orm.public.BillingCheckoutSession
      .where({ id: session.id })
      .first();

    expect(persistedSession?.status).toBe('EXPIRED');

    const tenants = await prisma.client.orm.public.Tenant
      .where({ createdBy: user.id })
      .all();

    expect(tenants).toHaveLength(0);
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

  it('makes concurrent payment creation converge to one pending payment', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .delete();

    const results = await Promise.allSettled([
      payments.create(
        fixture.tenant.id,
        user.id,
        fixture.invoice.id,
        BillingPaymentProviderDto.SANDBOX,
      ),
      payments.create(
        fixture.tenant.id,
        user.id,
        fixture.invoice.id,
        BillingPaymentProviderDto.SANDBOX,
      ),
    ]);

    const fulfilled = results.filter(
      (item): item is PromiseFulfilledResult<Awaited<ReturnType<BillingPaymentService['create']>>> =>
        item.status === 'fulfilled',
    );

    expect(fulfilled.length).toBe(2);
    expect(new Set(fulfilled.map((item) => item.value.id)).size).toBe(1);

    const paymentsInDb = await prisma.client.orm.public.Payment
      .where({ invoiceId: fixture.invoice.id })
      .all();

    expect(paymentsInDb).toHaveLength(1);
    expect(paymentsInDb[0]?.status).toBe('PENDING');
  });

  it('rejects payment success when invoice and subscription are already inconsistent', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await prisma.client.orm.public.SubscriptionInvoice
      .where({ id: fixture.invoice.id })
      .update({ status: 'SUCCEEDED', paidAt: new Date().toISOString() });

    await expect(
      payments.sandboxSucceed(fixture.tenant.id, user.id, fixture.payment.id),
    ).rejects.toMatchObject({
      response: {
        message: 'Invoice terkait payment tidak dalam status PENDING',
      },
    });

    const payment = await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .first();
    expect(payment?.status).toBe('PENDING');
  });

  it('rejects payment success when payment amount differs from invoice', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .update({ amountMinor: fixture.invoice.finalAmountMinor + 1000 });

    await expect(
      payments.sandboxSucceed(fixture.tenant.id, user.id, fixture.payment.id),
    ).rejects.toMatchObject({
      response: {
        message: 'Nominal atau currency payment tidak sesuai dengan invoice',
      },
    });

    const payment = await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .first();
    expect(payment?.status).toBe('PENDING');
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

  it('uses the latest locked discount definition for the created invoice', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);
    const suffix = randomUUID().replaceAll('-', '');

    const discount = await prisma.client.orm.public.Discount.create({
      code: `TEST_SNAPSHOT_${suffix}`.toUpperCase(),
      name: 'Discount snapshot test',
      description: 'Verifies invoice pricing uses the locked definition',
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

    // Simulate an earlier preview using the old 10% definition, then change
    // the discount before the final invoice is created.
    await prisma.client.orm.public.Discount
      .where({ id: discount.id })
      .update({ percentage: 25 });

    const invoice = await invoices.create(fixture.tenant.id, user.id, {
      discountCode: discount.code,
    });

    expect(invoice.originalAmountMinor).toBe(fixture.price.amountMinor);
    expect(invoice.discountAmountMinor).toBe(
      Math.floor(fixture.price.amountMinor * 25 / 100),
    );
    expect(invoice.finalAmountMinor).toBe(
      fixture.price.amountMinor - invoice.discountAmountMinor,
    );

    const snapshot = await prisma.client.orm.public.InvoiceDiscount
      .where({ invoiceId: invoice.id })
      .first();

    expect(snapshot?.discountPercentage).toBe(25);
    expect(snapshot?.amountMinor).toBe(invoice.discountAmountMinor);
  });

  it('keeps checkout-session discount pricing as a snapshot when the definition changes', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const suffix = randomUUID().replaceAll('-', '');
    const discount = await prisma.client.orm.public.Discount.create({
      code: `TEST_SESSION_SNAPSHOT_${suffix}`.toUpperCase(),
      name: 'Checkout session snapshot test',
      description: 'Verifies session-time discount definition is preserved',
      type: 'PERCENTAGE',
      percentage: 10,
      duration: 'ONCE',
      usageLimit: 10,
      usageCount: 0,
      isActive: true,
    });

    await prisma.client.orm.public.DiscountPackage.create({
      discountId: discount.id,
      packageId: pkg.id,
    });

    const session = await checkoutSessions.create(user.id, {
      packageId: pkg.id,
      packagePriceId: price.id,
      workspaceName: 'Snapshot Workspace',
      discountCode: discount.code,
      provider: BillingCheckoutSessionProviderDto.SANDBOX,
    });

    await prisma.client.orm.public.Discount
      .where({ id: discount.id })
      .update({ percentage: 25, isActive: false });

    const result = await checkoutSessions.sandboxSucceed(user.id, session.id);
    const invoice = await prisma.client.orm.public.SubscriptionInvoice
      .where({ id: result.invoiceId })
      .first();
    const snapshot = await prisma.client.orm.public.InvoiceDiscount
      .where({ invoiceId: result.invoiceId })
      .first();

    expect(invoice?.discountAmountMinor).toBe(Math.floor(price.amountMinor * 10 / 100));
    expect(invoice?.finalAmountMinor).toBe(price.amountMinor - Math.floor(price.amountMinor * 10 / 100));
    expect(snapshot?.discountPercentage).toBe(10);
    expect(snapshot?.amountMinor).toBe(Math.floor(price.amountMinor * 10 / 100));
  });

  it('does not allow financial discount definition changes after first usage', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);
    const suffix = randomUUID().replaceAll('-', '');

    const discount = await prisma.client.orm.public.Discount.create({
      code: `TEST_IMMUTABLE_${suffix}`.toUpperCase(),
      name: 'Immutable discount test',
      description: 'Verifies used discount definitions cannot change',
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

    await invoices.create(fixture.tenant.id, user.id, {
      discountCode: discount.code,
    });

    await expect(
      discounts.update(discount.id, {
        percentage: 25,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Definisi discount tidak dapat diubah setelah discount pernah digunakan. Nonaktifkan discount dan buat discount baru untuk mengubah aturan.',
      },
    });

    const metadataUpdated = await discounts.update(discount.id, {
      name: 'Renamed immutable discount',
      description: 'Metadata can still be maintained',
      isActive: false,
    });

    expect(metadataUpdated.name).toBe('Renamed immutable discount');
    expect(metadataUpdated.isActive).toBe(false);

    const persisted = await prisma.client.orm.public.Discount
      .where({ id: discount.id })
      .first();

    expect(persisted?.percentage).toBe(10);
    expect(persisted?.usageCount).toBe(1);
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

    const succeeded = results.filter((item) => item.status === 'fulfilled');
    const usages = await prisma.client.orm.public.DiscountUsage
      .where({ discountId: discount.id, tenantId: fixture.tenant.id })
      .all();

    expect(succeeded.length).toBe(1);
    expect(usages).toHaveLength(1);
  });

  it('allocates unique sequential price versions when price creation races', async () => {
    const { pkg } = await seedPackage();

    const results = await Promise.all([
      catalog.addPrice(pkg.id, {
        billingPeriod: 'MONTHLY',
        amountMinor: 14900000,
        currency: 'IDR',
      }),
      catalog.addPrice(pkg.id, {
        billingPeriod: 'MONTHLY',
        amountMinor: 15900000,
        currency: 'IDR',
      }),
    ]);

    expect(new Set(results.map((item) => item.version)).size).toBe(2);
    expect(results.map((item) => item.version).sort((a, b) => a - b)).toEqual([2, 3]);

    const prices = await prisma.client.orm.public.SubscriptionPackagePrice
      .where({ packageId: pkg.id, billingPeriod: 'MONTHLY' })
      .all();

    expect(prices.map((item) => item.version).sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('does not allow concurrent project creation to exceed a feature limit', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(user.id, pkg.id, price.id);

    const existingFeature = await prisma.client.orm.public.SubscriptionFeature
      .where({ code: 'PROJECT' })
      .first();

    const feature = existingFeature ?? (await prisma.client.orm.public.SubscriptionFeature.create({
      code: 'PROJECT',
      name: 'Project limit test',
      valueType: 'LIMIT',
      isActive: true,
    }));

    if (feature.valueType !== 'LIMIT' || !feature.isActive) {
      throw new Error('PROJECT feature must be an active LIMIT feature for this regression test.');
    }

    await prisma.client.orm.public.SubscriptionPackageFeature.create({
      packageId: pkg.id,
      featureId: feature.id,
      enabled: true,
      limitValue: 1,
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.client.orm.public.TenantSubscription.create({
      tenantId: fixture.tenant.id,
      packageId: pkg.id,
      packagePriceId: price.id,
      status: 'ACTIVE',
      provider: 'SANDBOX',
      startedAt: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    const results = await Promise.allSettled([
      projects.create(
        { name: 'Concurrent Project A' },
        user.id,
        fixture.tenant.id,
      ),
      projects.create(
        { name: 'Concurrent Project B' },
        user.id,
        fixture.tenant.id,
      ),
    ]);

    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);

    const rejected = results.filter(
      (item): item is PromiseRejectedResult => item.status === 'rejected',
    );
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason?.response?.code).toBe('FEATURE_LIMIT_REACHED');

    const projectsInDb = await prisma.client.orm.public.Project
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(projectsInDb).toHaveLength(1);
  });

  it('does not allow concurrent cancellation to cancel the same subscription twice', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .update({ status: 'ACTIVE' });

    const results = await Promise.allSettled([
      subscriptions.cancel(fixture.tenant.id, user.id),
      subscriptions.cancel(fixture.tenant.id, user.id),
    ]);

    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(1);

    const subscription = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();

    expect(subscription?.status).toBe('CANCELLED');
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

  it('does not allow payment failure when invoice and subscription are inconsistent', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    const otherPeriodEnd = new Date();
    otherPeriodEnd.setMonth(otherPeriodEnd.getMonth() + 1);

    const otherSubscription = await prisma.client.orm.public.TenantSubscription.create({
      tenantId: fixture.tenant.id,
      packageId: fixture.pkg.id,
      packagePriceId: fixture.price.id,
      status: 'PENDING',
      provider: 'SANDBOX',
      startedAt: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: otherPeriodEnd.toISOString(),
    });

    await prisma.client.orm.public.SubscriptionInvoice
      .where({ id: fixture.invoice.id })
      .update({ subscriptionId: otherSubscription.id });

    await expect(
      payments.sandboxFail(fixture.tenant.id, user.id, fixture.payment.id),
    ).rejects.toMatchObject({
      response: {
        message: 'Invoice dan subscription terkait payment tidak konsisten',
      },
    });

    const payment = await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .first();

    expect(payment?.status).toBe('PENDING');
  });

  it('preserves the checkout session financial invariant across completed billing records', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();

    const session = await checkoutSessions.create(user.id, {
      packageId: pkg.id,
      packagePriceId: price.id,
      workspaceName: 'Checkout Invariant Workspace',
      provider: BillingCheckoutSessionProviderDto.SANDBOX,
    });

    const result = await checkoutSessions.sandboxSucceed(user.id, session.id);

    const [persistedSession, subscription, invoice, payment] = await Promise.all([
      prisma.client.orm.public.BillingCheckoutSession
        .where({ id: session.id })
        .first(),
      prisma.client.orm.public.TenantSubscription
        .where({ id: result.subscriptionId })
        .first(),
      prisma.client.orm.public.SubscriptionInvoice
        .where({ id: result.invoiceId })
        .first(),
      prisma.client.orm.public.Payment
        .where({ id: result.paymentId })
        .first(),
    ]);

    expect(persistedSession?.status).toBe('SUCCEEDED');
    expect(persistedSession?.finalAmountMinor).toBe(invoice?.finalAmountMinor);
    expect(persistedSession?.currency).toBe(invoice?.currency);
    expect(invoice?.subscriptionId).toBe(subscription?.id);
    expect(payment?.subscriptionId).toBe(subscription?.id);
    expect(payment?.invoiceId).toBe(invoice?.id);
    expect(payment?.amountMinor).toBe(invoice?.finalAmountMinor);
    expect(payment?.currency).toBe(invoice?.currency);
    expect(payment?.status).toBe('SUCCEEDED');
    expect(invoice?.status).toBe('SUCCEEDED');
    expect(subscription?.status).toBe('ACTIVE');
  });

  it('does not allow concurrent direct member creation to exceed workspace member limit', async () => {
    const fixture = await seedMemberCapacityFixture(2);
    const userA = await seedUser();
    const userB = await seedUser();

    const results = await Promise.allSettled([
      tenants.addMember(fixture.tenant.id, fixture.owner.id, {
        userId: userA.id,
        roleId: fixture.role.id,
      }),
      tenants.addMember(fixture.tenant.id, fixture.owner.id, {
        userId: userB.id,
        roleId: fixture.role.id,
      }),
    ]);

    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(1);

    const members = await prisma.client.orm.public.TenantMember
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(members).toHaveLength(2);
  });

  it('does not allow concurrent invitations to exceed workspace member reservation limit', async () => {
    const fixture = await seedMemberCapacityFixture(2);
    const emailA = `invite_${randomUUID()}@example.test`;
    const emailB = `invite_${randomUUID()}@example.test`;

    const results = await Promise.allSettled([
      tenants.createInvitation(fixture.tenant.id, fixture.owner.id, {
        email: emailA,
        roleId: fixture.role.id,
      }),
      tenants.createInvitation(fixture.tenant.id, fixture.owner.id, {
        email: emailB,
        roleId: fixture.role.id,
      }),
    ]);

    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(1);

    const invitations = await prisma.client.orm.public.TenantInvitation
      .where({ tenantId: fixture.tenant.id })
      .all();

    const pendingInvitations = invitations.filter(
      (item) =>
        !item.acceptedAt &&
        new Date(item.expiresAt as string | Date).getTime() > Date.now(),
    );

    const members = await prisma.client.orm.public.TenantMember
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(members.length + pendingInvitations.length).toBeLessThanOrEqual(2);
    expect(pendingInvitations).toHaveLength(1);
  });

  it('does not allow concurrent invitation acceptance to exceed workspace member limit', async () => {
    const fixture = await seedMemberCapacityFixture(3);
    const userA = await seedUser();
    const userB = await seedUser();

    const invitationA = await prisma.client.orm.public.TenantInvitation.create({
      tenantId: fixture.tenant.id,
      email: userA.email,
      role: 'MEMBER',
      roleId: fixture.role.id,
      token: `TEST-INVITE-${randomUUID()}`,
      invitedBy: fixture.owner.id,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const invitationB = await prisma.client.orm.public.TenantInvitation.create({
      tenantId: fixture.tenant.id,
      email: userB.email,
      role: 'MEMBER',
      roleId: fixture.role.id,
      token: `TEST-INVITE-${randomUUID()}`,
      invitedBy: fixture.owner.id,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    await prisma.client.orm.public.SubscriptionPackageFeature
      .where({
        packageId: fixture.pkg.id,
        featureId: fixture.memberFeature.id,
      })
      .update({ limitValue: 2 });

    const results = await Promise.allSettled([
      tenants.acceptInvitation(invitationA.token, userA.id),
      tenants.acceptInvitation(invitationB.token, userB.id),
    ]);

    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(1);

    const members = await prisma.client.orm.public.TenantMember
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(members).toHaveLength(2);

    const acceptedInvitations = await prisma.client.orm.public.TenantInvitation
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(acceptedInvitations.filter((item) => item.acceptedAt)).toHaveLength(1);
  });


});
