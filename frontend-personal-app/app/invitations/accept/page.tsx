'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptTenantInvitation } from '@/lib/tenant';
import { isAuthenticated } from '@/lib/auth';
import { ApiError } from '@/lib/api';

type InvitationState = 'loading' | 'error' | 'success';

function Icon({ type }: { type: 'mail' | 'check' | 'alert' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      {type === 'mail' ? <><rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="m5.5 7 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></> : null}
      {type === 'check' ? <path d="M5 12.5 9.2 17 19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {type === 'alert' ? <><path d="M12 4.5 20 19H4L12 4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 9v4.5M12 16.5v.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></> : null}
    </svg>
  );
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const [state, setState] = useState<InvitationState>('loading');
  const [status, setStatus] = useState('Memverifikasi invitation...');
  const [error, setError] = useState('');

  const tokenFromUrl = useMemo(
    () => new URLSearchParams(window.location.search).get('token'),
    [],
  );

  useEffect(() => {
    const token = tokenFromUrl || window.sessionStorage.getItem('pda_pending_invitation_token');

    if (!token) {
      setState('error');
      setError('Link invitation tidak memiliki token yang valid.');
      return;
    }

    if (!isAuthenticated()) {
      window.sessionStorage.setItem('pda_pending_invitation_token', token);
      router.replace('/login?invitation=' + encodeURIComponent(token));
      return;
    }

    void (async () => {
      try {
        setStatus('Menerima invitation dan menyiapkan workspace...');
        const result = await acceptTenantInvitation(token);
        window.localStorage.setItem('pda_active_tenant_id', result.tenantId);
        window.sessionStorage.removeItem('pda_pending_invitation_token');
        setState('success');
        setStatus('Invitation berhasil diterima.');
        window.setTimeout(() => router.replace('/workspace-selection'), 900);
      } catch (err) {
        setState('error');
        setError(err instanceof ApiError ? err.message : 'Gagal menerima invitation. Silakan coba lagi.');
      }
    })();
  }, [router, tokenFromUrl]);

  const isNotFound = error.toLowerCase().includes('tidak ditemukan');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f7fb] px-4 py-10 text-zinc-950">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-100/70 blur-3xl" />

      <section className="relative w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/10"><Icon type="mail" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Personal Developer Assistant</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5">
          <div className="border-b border-zinc-100 bg-gradient-to-br from-cyan-50 via-white to-indigo-50 px-6 py-8 text-center sm:px-10">
            <div className={'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ' + (state === 'success' ? 'bg-emerald-100 text-emerald-700' : state === 'error' ? 'bg-red-100 text-red-700' : 'bg-white text-cyan-700 shadow-sm ring-1 ring-zinc-200')}>
              {state === 'success' ? <Icon type="check" /> : state === 'error' ? <Icon type="alert" /> : <Icon type="mail" />}
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
              {state === 'success' ? 'Invitation diterima' : state === 'error' ? 'Invitation tidak dapat diterima' : 'Anda mendapat invitation'}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
              {state === 'success' ? 'Workspace sudah ditambahkan ke akun kamu. Kami akan mengarahkan kamu ke daftar workspace.' : state === 'error' ? error : status}
            </p>
          </div>

          <div className="px-6 py-7 sm:px-10">
            {state === 'loading' ? (
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200"><span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-cyan-600" /></span>
                <div><p className="text-sm font-semibold text-zinc-900">Memproses invitation</p><p className="mt-1 text-xs text-zinc-500">Mohon tunggu beberapa saat.</p></div>
              </div>
            ) : state === 'success' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Icon type="check" /><div><p className="font-semibold">Workspace berhasil ditambahkan.</p><p className="mt-1 text-emerald-700">Kamu sekarang dapat mengakses workspace sesuai role invitation.</p></div></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full w-full animate-pulse rounded-full bg-emerald-500" /></div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-900">{isNotFound ? 'Invitation mungkin sudah tidak aktif.' : 'Ada masalah saat menerima invitation.'}</p>
                  <p className="mt-1 text-sm leading-6 text-red-700">{isNotFound ? 'Jika kamu menerima beberapa email invitation, gunakan email invitation yang paling terbaru.' : 'Periksa kembali akun yang digunakan atau coba buka link invitation kembali.'}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => router.replace('/workspace-selection')} className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">Ke Workspace</button>
                  <button type="button" onClick={() => router.replace('/login')} className="flex-1 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">Login</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-400">Invitation workspace bersifat pribadi dan hanya dapat digunakan oleh akun dengan email yang menerima invitation.</p>
      </section>
    </main>
  );
}