'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TenantsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspace-settings');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
      <p className="text-sm text-zinc-500">Membuka Workspace Settings...</p>
    </main>
  );
}
