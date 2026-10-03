import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

const RENEWAL_GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class BillingRenewalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async processDue(
    subscriptionId: string,
    now = new Date(),
  ): Promise<{ id: string; status: string; currentPeriodEnd: string }> {
    let changed = false;
    let previousStatus = '';
    let result: { id: string; status: string; currentPeriodEnd: string };

    result = await this.prisma.client.transaction(async (tx) => {
      const initial = await tx.orm.public.TenantSubscription
        .where({ id: subscriptionId })
        .first();

      if (!initial) {
        throw new NotFoundException('Subscription tidak ditemukan');
      }

      const tenantLock = this.prisma.client.raw.sql`
        UPDATE "public"."tenant"
        SET "updatedAt" = "updatedAt"
        WHERE "id" = ${initial.tenantId}
      `.affectedCount().build();

      await tx.execute(tenantLock);

      const subscriptionLock = this.prisma.client.raw.sql`
        UPDATE "public"."tenantSubscription"
        SET "updatedAt" = "updatedAt"
        WHERE "id" = ${subscriptionId}
          AND "tenantId" = ${initial.tenantId}
      `.affectedCount().build();

      await tx.execute(subscriptionLock);

      const current = await tx.orm.public.TenantSubscription
        .where({ id: subscriptionId, tenantId: initial.tenantId })
        .first();

      if (!current) {
        throw new NotFoundException('Subscription tidak ditemukan');
      }

      previousStatus = String(current.status);

      if (['CANCELLED', 'EXPIRED', 'PENDING'].includes(String(current.status))) {
        return {
          id: current.id,
          status: String(current.status),
          currentPeriodEnd: String(current.currentPeriodEnd),
        };
      }

      const periodEnd = new Date(String(current.currentPeriodEnd));
      const nowMs = now.getTime();
      const periodEndMs = periodEnd.getTime();

      if (periodEndMs > nowMs) {
        return {
          id: current.id,
          status: String(current.status),
          currentPeriodEnd: String(current.currentPeriodEnd),
        };
      }

      const graceEndMs = periodEndMs + RENEWAL_GRACE_PERIOD_MS;
      const nextStatus = nowMs <= graceEndMs ? 'PAST_DUE' : 'EXPIRED';

      if (String(current.status) === nextStatus) {
        return {
          id: current.id,
          status: String(current.status),
          currentPeriodEnd: String(current.currentPeriodEnd),
        };
      }

      const updated = await tx.orm.public.TenantSubscription
        .where({
          id: current.id,
          tenantId: current.tenantId,
          status: current.status,
        })
        .update({ status: nextStatus });

      if (!updated) {
        throw new ConflictException(
          'Subscription berubah status saat proses renewal',
        );
      }

      changed = true;

      return {
        id: current.id,
        status: nextStatus,
        currentPeriodEnd: String(current.currentPeriodEnd),
      };
    });

    if (changed) {
      await this.auditService.create({
        action:
          result.status === 'PAST_DUE'
            ? 'BILLING.SUBSCRIPTION_PAST_DUE'
            : 'BILLING.SUBSCRIPTION_EXPIRED',
        entity: 'TenantSubscription',
        entityId: result.id,
        description:
          result.status === 'PAST_DUE'
            ? 'Subscription masuk masa renewal grace period'
            : 'Subscription melewati renewal grace period',
        metadata: {
          previousStatus,
          currentStatus: result.status,
          gracePeriodDays: 3,
        },
      });
    }

    return result;
  }
}
