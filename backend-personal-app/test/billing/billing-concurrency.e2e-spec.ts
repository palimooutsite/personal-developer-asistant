import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { BillingModule } from '../../src/billing/billing.module.js';
import { BillingCheckoutSessionService } from '../../src/billing/checkout-session.service.js';
import { BillingCheckoutService } from '../../src/billing/checkout.service.js';
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
  let legacyCheckout: BillingCheckoutService;
  let subscriptions: BillingSubscriptionService;
  let payments: BillingPaymentService;
  let invoices: BillingInvoiceService;
  let discounts: BillingDiscountService;
  let projects: ProjectsService;
  let catalog: BillingCatalogService;
  let tenants: TenantService;
  let featureService: BillingFeatureService;

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
    legacyCheckout = moduleRef.get(BillingCheckoutService);
    subscriptions = moduleRef.get(BillingSubscriptionService);
    payments = moduleRef.get(BillingPaymentService);
    invoices = moduleRef.get(BillingInvoiceService);
    discounts = moduleRef.get(BillingDiscountService);
    projects = moduleRef.get(ProjectsService);
    catalog = moduleRef.get(BillingCatalogService);
    tenants = moduleRef.get(TenantService);
    featureService = moduleRef.get(BillingFeatureService);
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

    return { owner, pkg, price, ...fixture, memberFeature, role };
  }

  it('menggunakan currentPeriodEnd yang dihitung dari saat initial payment berhasil', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await payments.sandboxSucceed(
      fixture.tenant.id,
      user.id,
      fixture.payment.id,
    );

    const oldPeriodStart = new Date(Date.now() - 86400000 * 5);
    const oldPeriodEnd = new Date(oldPeriodStart);
    oldPeriodEnd.setMonth(oldPeriodEnd.getMonth() + 1);

    await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .update({
        currentPeriodStart: oldPeriodStart.toISOString(),
        currentPeriodEnd: oldPeriodEnd.toISOString(),
      });

    await payments.sandboxSucceed(
      fixture.tenant.id,
      user.id,
      fixture.payment.id,
    );

    const subscription = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();

    expect(subscription?.status).toBe('ACTIVE');

    const periodStart = new Date(String(subscription?.currentPeriodStart));
    const periodEnd = new Date(String(subscription?.currentPeriodEnd));

    const expectedEnd = new Date(periodStart);
    expectedEnd.setMonth(expectedEnd.getMonth() + 1);

    expect(Math.abs(periodEnd.getTime() - expectedEnd.getTime())).toBeLessThan(100);
  });

  it('menolak pembuatan invoice ketika currentPeriodEnd subscription sudah terlewati', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(user.id, pkg.id, price.id);
    const now = new Date();
    const expiredAt = new Date(now.getTime() - 1000).toISOString();

    const subscription = await prisma.client.orm.public.TenantSubscription.create({
      tenantId: fixture.tenant.id,
      packageId: pkg.id,
      packagePriceId: price.id,
      status: 'ACTIVE',
      provider: 'SANDBOX',
      startedAt: new Date(now.getTime() - 86400000 * 31).toISOString(),
      currentPeriodStart: new Date(now.getTime() - 86400000 * 31).toISOString(),
      currentPeriodEnd: expiredAt,
    });

    await expect(
      invoices.create(fixture.tenant.id, user.id, {}),
    ).rejects.toMatchObject({
      response: {
        message: 'Workspace belum memiliki subscription aktif',
      },
    });

    const invoicesInDb = await prisma.client.orm.public.SubscriptionInvoice
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(invoicesInDb).toHaveLength(0);
    expect(subscription.status).toBe('ACTIVE');
  });

  it('tidak menganggap subscription ACTIVE yang periodenya sudah berakhir sebagai subscription aktif', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(user.id, pkg.id, price.id);
    const now = new Date();
    const periodStart = new Date(now.getTime() - 86400000 * 31);
    const periodEnd = new Date(now.getTime() - 1000);

    await prisma.client.orm.public.TenantSubscription.create({
      tenantId: fixture.tenant.id,
      packageId: pkg.id,
      packagePriceId: price.id,
      status: 'ACTIVE',
      provider: 'SANDBOX',
      startedAt: periodStart.toISOString(),
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    await expect(
      subscriptions.getCurrent(fixture.tenant.id, user.id),
    ).resolves.toBeNull();
  });

  it('menolak akses feature ketika subscription ACTIVE sudah melewati currentPeriodEnd', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(user.id, pkg.id, price.id);
    const feature = await prisma.client.orm.public.SubscriptionFeature
      .where({ code: 'PROJECT' })
      .first();
    const projectFeature = feature ?? await prisma.client.orm.public.SubscriptionFeature.create({
      code: 'PROJECT',
      name: 'Project limit test',
      valueType: 'LIMIT',
      isActive: true,
    });

    await prisma.client.orm.public.SubscriptionPackageFeature.create({
      packageId: pkg.id,
      featureId: projectFeature.id,
      enabled: true,
      limitValue: 10,
    });

    const now = new Date();
    const periodStart = new Date(now.getTime() - 86400000 * 31);
    const periodEnd = new Date(now.getTime() - 1000);

    await prisma.client.orm.public.TenantSubscription.create({
      tenantId: fixture.tenant.id,
      packageId: pkg.id,
      packagePriceId: price.id,
      status: 'ACTIVE',
      provider: 'SANDBOX',
      startedAt: periodStart.toISOString(),
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    await expect(
      featureService.check(fixture.tenant.id, user.id, 'PROJECT', 0),
    ).rejects.toMatchObject({
      response: {
        message: 'Workspace belum memiliki subscription aktif',
      },
    });
  });

  it('tidak membuat payment untuk invoice yang subscription-nya sudah dibatalkan', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .update({ status: 'CANCELLED', cancelledAt: new Date().toISOString() });

    await expect(
      payments.create(
        fixture.tenant.id,
        user.id,
        fixture.invoice.id,
        BillingPaymentProviderDto.SANDBOX,
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Subscription terkait invoice tidak dapat menerima payment',
      },
    });

    const paymentsInDb = await prisma.client.orm.public.Payment
      .where({ invoiceId: fixture.invoice.id })
      .all();

    expect(paymentsInDb).toHaveLength(1);
    expect(paymentsInDb[0]?.status).toBe('PENDING');
  });

  it('tidak meninggalkan invoice ketika pembuatan payment pada legacy checkout gagal', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(user.id, pkg.id, price.id);

    const originalPaymentCreate = payments.create;
    payments.create = async () => {
      throw new Error('Simulated payment creation failure');
    };

    try {
      await expect(
        legacyCheckout.create(fixture.tenant.id, user.id, {
          packageId: pkg.id,
          packagePriceId: price.id,
          provider: BillingPaymentProviderDto.SANDBOX,
        }),
      ).rejects.toThrow('Simulated payment creation failure');
    } finally {
      payments.create = originalPaymentCreate;
    }

    const persistedSubscriptions = await prisma.client.orm.public.TenantSubscription
      .where({ tenantId: fixture.tenant.id })
      .all();
    const persistedInvoices = await prisma.client.orm.public.SubscriptionInvoice
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(persistedSubscriptions).toHaveLength(1);
    expect(persistedSubscriptions[0]?.status).toBe('CANCELLED');
    expect(persistedInvoices).toHaveLength(1);
    expect(persistedInvoices[0]?.status).toBe('PENDING');
    expect(persistedInvoices[0]?.subscriptionId).toBe(persistedSubscriptions[0]?.id);
  });

  it('tidak meninggalkan subscription ketika pembuatan invoice pada legacy checkout gagal', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(user.id, pkg.id, price.id);

    const originalInvoiceCreate = invoices.create;
    invoices.create = async () => {
      throw new Error('Simulated invoice creation failure');
    };

    try {
      await expect(
        legacyCheckout.create(fixture.tenant.id, user.id, {
          packageId: pkg.id,
          packagePriceId: price.id,
          provider: BillingPaymentProviderDto.SANDBOX,
        }),
      ).rejects.toThrow('Simulated invoice creation failure');
    } finally {
      invoices.create = originalInvoiceCreate;
    }

    const persistedSubscriptions = await prisma.client.orm.public.TenantSubscription
      .where({ tenantId: fixture.tenant.id })
      .all();
    const persistedInvoices = await prisma.client.orm.public.SubscriptionInvoice
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(persistedSubscriptions).toHaveLength(1);
    expect(persistedSubscriptions[0]?.status).toBe('CANCELLED');
    expect(persistedInvoices).toHaveLength(0);
  });

  it('tidak membuat dua subscription aktif saat legacy checkout dijalankan bersamaan', async () => {
    const user = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(user.id, pkg.id, price.id);

    const results = await Promise.allSettled([
      legacyCheckout.create(fixture.tenant.id, user.id, {
        packageId: pkg.id,
        packagePriceId: price.id,
        provider: BillingPaymentProviderDto.SANDBOX,
      }),
      legacyCheckout.create(fixture.tenant.id, user.id, {
        packageId: pkg.id,
        packagePriceId: price.id,
        provider: BillingPaymentProviderDto.SANDBOX,
      }),
    ]);

    const fulfilled = results.filter((item) => item.status === 'fulfilled');
    const rejected = results.filter((item) => item.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const subscriptionsInDb = await prisma.client.orm.public.TenantSubscription
      .where({ tenantId: fixture.tenant.id })
      .all();
    const invoicesInDb = await prisma.client.orm.public.SubscriptionInvoice
      .where({ tenantId: fixture.tenant.id })
      .all();
    const paymentsInDb = await prisma.client.orm.public.Payment
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(
      subscriptionsInDb.filter((item) =>
        ['PENDING', 'TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)),
      ),
    ).toHaveLength(1);

    expect(subscriptionsInDb).toHaveLength(1);
    expect(invoicesInDb).toHaveLength(1);
    expect(paymentsInDb).toHaveLength(1);
  });

  it('menolak legacy checkout dari user yang bukan member tenant', async () => {
    const owner = await seedUser();
    const attacker = await seedUser();
    const { pkg, price } = await seedPackage();
    const fixture = await seedTenantWithMember(owner.id, pkg.id, price.id);

    await expect(
      legacyCheckout.create(fixture.tenant.id, attacker.id, {
        packageId: pkg.id,
        packagePriceId: price.id,
        provider: BillingPaymentProviderDto.SANDBOX,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Workspace tidak ditemukan atau Anda bukan member workspace',
      },
    });

    const subscriptionsInDb = await prisma.client.orm.public.TenantSubscription
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(subscriptionsInDb).toHaveLength(0);
  });

  it('menolak user lain menyelesaikan checkout session', async () => {
    const owner = await seedUser();
    const attacker = await seedUser();
    const { pkg, price } = await seedPackage();

    const session = await checkoutSessions.create(owner.id, {
      packageId: pkg.id,
      packagePriceId: price.id,
      workspaceName: 'Cross User Checkout Workspace',
      provider: BillingCheckoutSessionProviderDto.SANDBOX,
    });

    await expect(
      checkoutSessions.sandboxSucceed(attacker.id, session.id),
    ).rejects.toMatchObject({
      response: {
        message: 'Checkout session tidak ditemukan',
      },
    });

    await expect(
      checkoutSessions.sandboxFail(attacker.id, session.id),
    ).rejects.toMatchObject({
      response: {
        message: 'Checkout session tidak ditemukan',
      },
    });

    const persistedSession = await prisma.client.orm.public.BillingCheckoutSession
      .where({ id: session.id })
      .first();

    expect(persistedSession?.userId).toBe(owner.id);
    expect(persistedSession?.status).toBe('PENDING');

    const createdTenants = await prisma.client.orm.public.Tenant
      .where({ createdBy: owner.id })
      .all();

    expect(createdTenants).toHaveLength(0);

    const payments = await prisma.client.orm.public.Payment
      .where({ providerPaymentId: `SANDBOX-SESSION-${session.id}` })
      .all();

    expect(payments).toHaveLength(0);
  });

  it('membuat request succeed checkout session yang bersamaan menghasilkan satu hasil billing', async () => {
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

  it('tidak menyelesaikan checkout session yang sudah kedaluwarsa saat terjadi race lifecycle', async () => {
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

  it('membuat request payment succeed yang bersamaan tetap idempotent', async () => {
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

  it('menolak payment yang sudah kedaluwarsa untuk menjadi SUCCEEDED', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .update({ expiresAt: new Date(Date.now() - 1000).toISOString() });

    await expect(
      payments.sandboxSucceed(
        fixture.tenant.id,
        user.id,
        fixture.payment.id,
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Payment sudah kedaluwarsa',
      },
    });

    const payment = await prisma.client.orm.public.Payment
      .where({ id: fixture.payment.id })
      .first();
    const invoice = await prisma.client.orm.public.SubscriptionInvoice
      .where({ id: fixture.invoice.id })
      .first();
    const subscription = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();

    expect(payment?.status).toBe('PENDING');
    expect(invoice?.status).toBe('PENDING');
    expect(subscription?.status).toBe('PENDING');
  });

  it('membuat pembuatan payment yang bersamaan menghasilkan satu payment PENDING', async () => {
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

  it('menolak payment success ketika invoice dan subscription sudah tidak konsisten', async () => {
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

  it('menolak payment success ketika nominal payment berbeda dari invoice', async () => {
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

  it('memastikan transisi payment succeed dan fail tidak dapat terjadi bersamaan', async () => {
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

  it('menggunakan definisi discount terbaru yang sudah di-lock saat membuat invoice', async () => {
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

  it('mempertahankan harga discount checkout session sebagai snapshot meskipun definisinya berubah', async () => {
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

  it('menolak perubahan finansial discount setelah discount pernah digunakan', async () => {
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

  it('mencegah discount sekali pakai digunakan dua kali oleh invoice yang dibuat bersamaan', async () => {
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

  it('mengalokasikan versi harga berurutan dan unik saat pembuatan harga mengalami race', async () => {
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

  it('mencegah pembuatan project bersamaan melampaui batas feature', async () => {
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

  it('mencegah cancellation bersamaan membatalkan subscription yang sama dua kali', async () => {
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

  it('tidak membuat dua subscription aktif saat pembuatan subscription mengalami race', async () => {
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

  it('menolak payment failure ketika invoice dan subscription tidak konsisten', async () => {
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

  it('mempertahankan invariant finansial checkout session pada seluruh billing record yang selesai', async () => {
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

  it('mencegah pembuatan member langsung secara bersamaan melampaui limit member workspace', async () => {
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

  it('mencegah invitation bersamaan melampaui limit reservasi member workspace', async () => {
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

  it('mencegah penerimaan invitation bersamaan melampaui limit member workspace', async () => {
    const fixture = await seedMemberCapacityFixture(3);
    const existingMemberUser = await seedUser();

    await prisma.client.orm.public.TenantMember.create({
      tenantId: fixture.tenant.id,
      userId: existingMemberUser.id,
      role: 'MEMBER',
      roleId: fixture.role.id,
    });

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

    const results = await Promise.allSettled([
      tenants.acceptInvitation(invitationA.token, userA.id),
      tenants.acceptInvitation(invitationB.token, userB.id),
    ]);

    // Pending invitations are reservations. This fixture intentionally seeds
    // an already-over-reserved workspace to verify acceptance cannot consume
    // another reservation and push the member count beyond the package limit.
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(0);
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(2);

    const members = await prisma.client.orm.public.TenantMember
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(members).toHaveLength(2);

    const invitations = await prisma.client.orm.public.TenantInvitation
      .where({ tenantId: fixture.tenant.id })
      .all();

    expect(invitations.filter((item) => item.acceptedAt)).toHaveLength(0);
    expect(
      members.length +
        invitations.filter(
          (item) =>
            !item.acceptedAt &&
            new Date(item.expiresAt as string | Date).getTime() > Date.now(),
        ).length,
    ).toBe(4);
  });


  it('menolak cancellation pada subscription PENDING agar payment awal tetap dapat diselesaikan', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await expect(
      subscriptions.cancel(fixture.tenant.id, user.id),
    ).rejects.toMatchObject({
      response: {
        message: 'Tidak ada subscription aktif untuk workspace',
      },
    });

    const before = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();

    expect(before?.status).toBe('PENDING');

    await expect(
      payments.sandboxSucceed(
        fixture.tenant.id,
        user.id,
        fixture.payment.id,
      ),
    ).resolves.toMatchObject({
      status: 'SUCCEEDED',
    });

    const after = await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .first();

    expect(after?.status).toBe('ACTIVE');
  });

  it('tidak dapat mengaktifkan kembali subscription CANCELLED melalui payment PENDING', async () => {
    const user = await seedUser();
    const fixture = await seedPendingPayment(user.id);

    await prisma.client.orm.public.TenantSubscription
      .where({ id: fixture.subscription.id })
      .update({
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
      });

    await expect(
      payments.sandboxSucceed(
        fixture.tenant.id,
        user.id,
        fixture.payment.id,
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Subscription terkait payment tidak dalam status PENDING',
      },
    });

    const [payment, invoice, subscription] = await Promise.all([
      prisma.client.orm.public.Payment
        .where({ id: fixture.payment.id })
        .first(),
      prisma.client.orm.public.SubscriptionInvoice
        .where({ id: fixture.invoice.id })
        .first(),
      prisma.client.orm.public.TenantSubscription
        .where({ id: fixture.subscription.id })
        .first(),
    ]);

    expect(payment?.status).toBe('PENDING');
    expect(invoice?.status).toBe('PENDING');
    expect(subscription?.status).toBe('CANCELLED');
  });


});
