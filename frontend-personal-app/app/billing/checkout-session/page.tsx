'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import {
  createBillingCheckoutSession,
  getBillingPackage,
  type BillingPackage,
  type BillingPrice,
} from '../../../lib/billing';

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function CheckoutSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageCode = (searchParams.get('package') ?? 'PRO').toUpperCase();
  const period = (searchParams.get('billingPeriod') ?? 'MONTHLY').toUpperCase();

  const [selectedPackage, setSelectedPackage] = useState<BillingPackage | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getBillingPackage(packageCode.toUpperCase())
      .then((result) => setSelectedPackage(result))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Package tidak dapat dimuat.');
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => {
    const price = selectedPackage?.prices?.find(
      (item) => item.isActive && item.billingPeriod.toUpperCase() === period,
    ) ?? null;
    return { pkg: selectedPackage, price };
  }, [selectedPackage, period]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.pkg || !selected.price || !workspaceName.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const session = await createBillingCheckoutSession(
        selected.pkg.id,
        selected.price.id,
        workspaceName.trim(),
        discount,
      );
      router.push('/billing/checkout-session/payment?sessionId=' + session.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout gagal dibuat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8 text-zinc-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">
            Setup Workspace
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Siapkan workspace kamu
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Workspace baru akan dibuat setelah pembayaran berhasil.
          </p>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 h-40 animate-pulse rounded-2xl bg-zinc-100" />
          ) : selected.pkg && selected.price ? (
            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Paket dipilih
                </p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{selected.pkg.name}</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {selected.price.billingPeriod === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}
                    </p>
                  </div>
                  <p className="text-2xl font-black">
                    {money(selected.price.amountMinor, selected.price.currency)}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="workspaceName" className="text-sm font-semibold">
                  Nama Workspace
                </label>
                <input
                  id="workspaceName"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  maxLength={120}
                  required
                  placeholder="Contoh: Personal Development"
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label htmlFor="discount" className="text-sm font-semibold">
                  Discount code <span className="font-normal text-zinc-400">(opsional)</span>
                </label>
                <input
                  id="discount"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  maxLength={50}
                  placeholder="PROMO10"
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <button
                type="submit"
                disabled={busy || !workspaceName.trim()}
                className="w-full rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Menyiapkan checkout...' : 'Lanjutkan ke Sandbox Payment'}
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Paket atau harga yang dipilih tidak tersedia. Kembali ke halaman harga dan pilih paket lagi.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


export default function CheckoutSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f6f7fb] px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-zinc-500">Memuat checkout...</p>
          </div>
        </main>
      }
    >
      <CheckoutSessionContent />
    </Suspense>
  );
}
