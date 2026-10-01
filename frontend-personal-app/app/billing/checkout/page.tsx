import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import {
  createBillingCheckout,
  getBillingPackageFeatures,
  type BillingPackageFeaturesResponse,
} from '../../../lib/billing';
import { useTenant } from '../../../components/providers/TenantProvider';

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeTenantId } = useTenant();

  const packageId = searchParams.get('packageId');
  const priceId = searchParams.get('priceId');

  const [data, setData] = useState<BillingPackageFeaturesResponse | null>(null);
  const [discount, setDiscount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packageId) return;

    void getBillingPackageFeatures(packageId)
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Package tidak dapat dimuat.');
      });
  }, [packageId]);

  const price = useMemo(
    () => data?.package.prices?.find((item) => item.id === priceId) ?? null,
    [data, priceId],
  );

  async function submit() {
    if (!activeTenantId || !packageId || !priceId) return;

    setBusy(true);
    setError(null);

    try {
      const result = await createBillingCheckout(
        activeTenantId,
        packageId,
        priceId,
        discount,
      );
      router.push('/billing/payment/' + result.payment.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout gagal.');
    } finally {
      setBusy(false);
    }
  }

  if (!packageId || !priceId) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6">
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8">
          <h1 className="text-2xl font-bold">Checkout tidak lengkap</h1>
          <Link
            href="/billing"
            className="mt-5 inline-flex text-sm font-semibold text-cyan-700"
          >
            Kembali ke Billing
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6 sm:p-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/billing"
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-900"
        >
          ← Kembali
        </Link>

        <h1 className="mt-5 text-3xl font-bold">Checkout</h1>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {data ? (
          <div className="mt-7 rounded-3xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Package
            </p>
            <h2 className="mt-2 text-2xl font-bold">{data.package.name}</h2>
            <p className="mt-1 text-sm text-zinc-500">{data.package.description}</p>

            <div className="mt-6 rounded-2xl bg-zinc-50 p-5">
              <p className="text-sm text-zinc-500">Harga</p>
              <p className="mt-1 text-3xl font-bold">
                {price ? money(price.amountMinor, price.currency) : '—'}
              </p>
              <p className="text-xs text-zinc-400">
                {price?.billingPeriod === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}
              </p>
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold">
                Discount code{' '}
                <span className="font-normal text-zinc-400">(opsional)</span>
              </label>
              <input
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                placeholder="PROMO10"
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-cyan-400"
              />
            </div>

            <button
              disabled={busy || !price}
              onClick={() => void submit()}
              className="mt-6 w-full rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Memproses...' : 'Lanjutkan ke Sandbox Payment'}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f6f7fb] p-6 sm:p-10">
          <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-8">
            <p className="text-sm text-zinc-500">Memuat checkout...</p>
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
