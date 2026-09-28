'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { acceptTenantInvitation } from '@/lib/tenant';
import { isAuthenticated } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Memproses invitation...');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('Token invitation tidak ditemukan.');
      return;
    }

    if (!isAuthenticated()) {
      window.sessionStorage.setItem('pda_pending_invitation_token', token);
      router.replace(`/login?invitation=${encodeURIComponent(token)}`);
      return;
    }

    void (async () => {
      try {
        const result = await acceptTenantInvitation(token);
        window.localStorage.setItem('pda_active_tenant_id', result.tenantId);
        window.sessionStorage.removeItem('pda_pending_invitation_token');
        setStatus('Invitation berhasil diterima. Mengalihkan ke workspace...');
        router.replace('/workspace-selection');
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Gagal menerima invitation.',
        );
      }
    })();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-zinc-200">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-700">Invitation tidak dapat diterima</h1>
            <p className="mt-3 text-sm text-zinc-500">{error}</p>
            <a href="/workspace-selection" className="mt-6 inline-block rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white">
              Kembali
            </a>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-zinc-950">Workspace Invitation</h1>
            <p className="mt-3 text-sm text-zinc-500">{status}</p>
          </>
        )}
      </div>
    </main>
  );
}
