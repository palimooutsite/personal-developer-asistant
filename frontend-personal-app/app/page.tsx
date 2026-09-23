'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '../lib/api';
import { getCurrentUser, logout, CurrentUser } from '../lib/auth';

const menus = [
  ['Projects', '/projects', 'Kelola project development dan anggota.', 'P'],
  ['Tasks', '/tasks', 'Atur pekerjaan, prioritas, dan progress.', 'T'],
  ['Knowledge', '/knowledge', 'Simpan dokumentasi dan pengetahuan.', 'K'],
  ['Code Snippets', '/snippets', 'Simpan dan kelola potongan kode.', '<>'],
  ['Documents', '/documents', 'Kelola dokumen dan file project.', 'D'],
  ['Dashboard', '/dashboard', 'Lihat ringkasan aktivitas dan statistik.', '▦'],
] as const;

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        setUser(await getCurrentUser());
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace('/login');
          return;
        }
      } finally {
        setLoading(false);
      }
    }
    void loadUser();
  }, [router]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (loading) {
    return <main className="min-h-screen bg-[#f6f7fb] p-8"><div className="mx-auto max-w-7xl"><div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-zinc-200" />)}</div></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-5 border-b border-zinc-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Personal Developer Assistant
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Selamat datang{user?.name ? `, ${user.name}` : ''}.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">Pilih menu yang ingin kamu gunakan untuk mengelola aktivitas development.</p>
          </div>
          <button type="button" onClick={handleLogout} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">Logout</button>
        </header>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Main Menu</p>
          <h2 className="mt-1 text-xl font-bold">Pilih Modul</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {menus.map(([title, href, description, icon]) => (
              <Link key={href} href={href} className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 text-sm font-bold text-white">{icon}</div>
                  <span className="text-zinc-300 transition group-hover:translate-x-1 group-hover:text-zinc-600">→</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
                <div className="mt-5 text-sm font-semibold text-zinc-700">Buka {title} →</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
