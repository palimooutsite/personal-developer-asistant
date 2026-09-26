'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import { createTenant, getTenants, type Tenant } from '../../lib/tenant';
import { setActiveTenantId } from '../../lib/tenant';

export default function WorkspaceSelectionPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function loadTenants() {
    setLoading(true);
    setError('');
    try {
      setTenants(await getTenants());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Workspace tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTenants();
  }, []);

  function chooseTenant(tenantId: string) {
    setActiveTenantId(tenantId);
    router.replace('/');
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError('');

    try {
      const tenant = await createTenant(name.trim());
      setActiveTenantId(tenant.id);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat workspace.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8 text-zinc-950 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">
            Personal Developer Assistant
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Pilih Workspace
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
            Pilih workspace yang ingin kamu gunakan. Semua project, task, knowledge,
            snippet, dan dokumen akan mengikuti workspace ini.
          </p>
        </header>

        {error ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Workspace Saya
              </p>
              <h2 className="mt-1 text-xl font-bold">Lanjutkan ke workspace</h2>
            </div>
            {!loading ? (
              <span className="text-sm text-zinc-400">{tenants.length} workspace</span>
            ) : null}
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((item) => (
                <div key={item} className="h-32 animate-pulse rounded-2xl bg-zinc-200" />
              ))}
            </div>
          ) : tenants.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => chooseTenant(tenant.id)}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-lg font-bold text-cyan-700">
                        {tenant.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold">{tenant.name}</h3>
                        <p className="mt-1 text-xs text-zinc-400">
                          Role: <span className="font-semibold text-zinc-600">{tenant.role}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xl text-zinc-300 transition group-hover:translate-x-1 group-hover:text-cyan-600">
                      →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-2xl text-zinc-400">
                +
              </div>
              <h3 className="mt-4 text-lg font-bold">Belum ada workspace</h3>
              <p className="mt-2 text-sm text-zinc-500">
                Buat workspace pertama kamu untuk mulai menggunakan aplikasi.
              </p>
            </div>
          )}
        </section>

        <section className="mx-auto mt-8 max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
            Workspace Baru
          </p>
          <h2 className="mt-1 text-xl font-bold">Buat workspace</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Kamu otomatis menjadi OWNER pada workspace yang baru dibuat.
          </p>

          <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              placeholder="Contoh: Personal Development"
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {creating ? 'Membuat...' : 'Buat Workspace'}
            </button>
          </form>
        </section>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="text-sm font-semibold text-zinc-400 hover:text-zinc-700"
          >
            Kembali ke login
          </button>
        </div>
      </div>
    </main>
  );
}
