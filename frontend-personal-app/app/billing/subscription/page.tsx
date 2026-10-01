'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '../../../lib/api';
import {
  getBillingUsage,
  getCurrentSubscription,
  type BillingSubscription,
  type BillingUsageResponse,
} from '../../../lib/billing';
import { useTenant } from '../../../components/providers/TenantProvider';

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export default function SubscriptionPage() {
  const { activeTenantId } = useTenant();
  const [subscription, setSubscription] =
    useState<BillingSubscription | null>(null);
  const [usage, setUsage] = useState<BillingUsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTenantId) return;

    void Promise.all([
      getCurrentSubscription(activeTenantId),
      getBillingUsage(activeTenantId),
    ])
      .then(([currentSubscription, currentUsage]) => {
        setSubscription(currentSubscription);
        setUsage(currentUsage);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Subscription tidak dapat dimuat.',
        );
      });
  }, [activeTenantId]);

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6 sm:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/billing" className="text-sm font-semibold text-zinc-500">
          ← Billing
        </Link>

        <h1 className="mt-5 text-3xl font-bold">Subscription</h1>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {subscription ? (
          <div className="mt-7 rounded-3xl border bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">
                  Current Plan
                </p>
                <h2 className="mt-2 text-3xl font-bold">
                  {subscription.package.name}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  {money(
                    subscription.packagePrice.amountMinor,
                    subscription.packagePrice.currency,
                  )}{' '}
                  /{' '}
                  {subscription.packagePrice.billingPeriod === 'MONTHLY'
                    ? 'bulan'
                    : 'tahun'}
                </p>
              </div>

              <span className="h-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {subscription.status}
              </span>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-400">Period Start</p>
                <p className="mt-1 text-sm font-semibold">
                  {new Date(subscription.currentPeriodStart).toLocaleString(
                    'id-ID',
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-400">Period End</p>
                <p className="mt-1 text-sm font-semibold">
                  {new Date(subscription.currentPeriodEnd).toLocaleString(
                    'id-ID',
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-7 rounded-3xl border bg-white p-8 text-center">
            Belum memiliki subscription aktif.
            <Link
              href="/billing"
              className="mt-4 inline-block font-semibold text-cyan-700"
            >
              Pilih paket
            </Link>
          </div>
        )}

        {usage ? (
          <div className="mt-7 rounded-3xl border bg-white p-7">
            <h2 className="text-xl font-bold">Feature Usage</h2>
            <div className="mt-5 divide-y">
              {usage.features.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between py-4"
                >
                  <div>
                    <p className="font-semibold">
                      {feature.name ?? feature.code}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {feature.remaining === null
                        ? 'Unlimited'
                        : feature.remaining + ' tersisa'}
                    </p>
                  </div>

                  <p className="text-sm font-bold">
                    {feature.currentUsage}
                    {feature.limitValue === null
                      ? ''
                      : ' / ' + feature.limitValue}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}