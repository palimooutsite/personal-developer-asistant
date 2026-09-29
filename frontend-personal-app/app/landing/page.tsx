'use client';

import Link from 'next/link';

const features = [
  {
    icon: '▦',
    title: 'Project terorganisir',
    description: 'Kelola project development, status, dan anggota tim dalam satu workspace.',
  },
  {
    icon: '✓',
    title: 'Task tanpa ribet',
    description: 'Atur prioritas, deadline, assignee, status, dan lihat pekerjaan dalam Kanban.',
  },
  {
    icon: '◈',
    title: 'Knowledge Base',
    description: 'Simpan dokumentasi teknis, catatan, dan pengetahuan tim agar mudah ditemukan.',
  },
  {
    icon: '</>',
    title: 'Code Snippets',
    description: 'Kumpulkan potongan kode reusable supaya tidak perlu mencari ulang dari awal.',
  },
  {
    icon: '▤',
    title: 'Documents',
    description: 'Simpan dan kelola dokumen yang berkaitan dengan pekerjaan development.',
  },
  {
    icon: '◎',
    title: 'Multi-workspace',
    description: 'Pisahkan pekerjaan pribadi, freelance, dan tim dengan workspace yang berbeda.',
  },
];

const plans = [
  {
    name: 'Free',
    price: 'Rp0',
    period: 'selamanya',
    description: 'Untuk developer yang ingin mulai menata workflow.',
    features: ['1 workspace', '1 pengguna', '3 project', '100 task', 'Knowledge & Snippets'],
    cta: 'Mulai Gratis',
    href: '/register',
    featured: false,
  },
  {
    name: 'Pro',
    price: 'Rp49.000',
    period: '/bulan',
    description: 'Untuk developer aktif yang butuh ruang kerja lebih lengkap.',
    features: ['5 workspace', '1 pengguna', 'Project tanpa batas', 'Task tanpa batas', 'Knowledge, Snippets & Documents'],
    cta: 'Pilih Pro',
    href: '/register',
    featured: true,
  },
  {
    name: 'Team',
    price: 'Rp149.000',
    period: '/bulan',
    description: 'Untuk tim kecil yang ingin bekerja lebih terstruktur.',
    features: ['Workspace tanpa batas', 'Hingga 10 anggota', 'Project & task tanpa batas', 'Role OWNER / ADMIN / MEMBER', 'Invite anggota via email'],
    cta: 'Mulai Team',
    href: '/register',
    featured: false,
  },
  {
    name: 'Business',
    price: 'Rp399.000',
    period: '/bulan',
    description: 'Untuk tim yang membutuhkan kapasitas dan kolaborasi lebih besar.',
    features: ['Workspace tanpa batas', 'Hingga 50 anggota', 'Semua fitur Team', 'Prioritas support', 'Onboarding tim'],
    cta: 'Hubungi Kami',
    href: '/register',
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-zinc-950">
      <nav className="border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/landing" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-xs font-bold text-white">PDA</span>
            <span className="font-bold tracking-tight">Personal Developer Assistant</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-zinc-500 sm:flex">
            <a href="#fitur" className="hover:text-zinc-950">Fitur</a>
            <a href="#cara-kerja" className="hover:text-zinc-950">Cara Kerja</a>
            <a href="#harga" className="hover:text-zinc-950">Harga</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 sm:inline-flex">Login</Link>
            <Link href="/register" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800">Mulai Gratis</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-[#f7f8fc]">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute -right-20 top-0 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Developer Workspace
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-6xl sm:leading-[1.05]">
              Semua pekerjaan development,
              <span className="block text-cyan-600">satu tempat.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              Personal Developer Assistant membantu kamu mengatur project, task, knowledge, code snippets, dan documents tanpa harus berpindah-pindah aplikasi.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-zinc-950/10 transition hover:-translate-y-0.5 hover:bg-zinc-800">
                Mulai Gratis →
              </Link>
              <a href="#harga" className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                Lihat Harga
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-zinc-500">
              <span>✓ Workspace terpisah</span>
              <span>✓ Task & Kanban</span>
              <span>✓ Kolaborasi tim</span>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-900/10 sm:p-5">
              <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Workspace</p>
                    <p className="mt-1 text-lg font-bold">Personal Development</p>
                  </div>
                  <span className="rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300">ACTIVE</span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-zinc-400">Projects</p><p className="mt-1 text-2xl font-bold">12</p></div>
                  <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-zinc-400">Tasks</p><p className="mt-1 text-2xl font-bold">48</p></div>
                  <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-zinc-400">Knowledge</p><p className="mt-1 text-2xl font-bold">86</p></div>
                  <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-zinc-400">Snippets</p><p className="mt-1 text-2xl font-bold">31</p></div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 p-4"><p className="text-xs font-semibold text-zinc-400">TODAY</p><p className="mt-2 font-bold">Build Project API</p><div className="mt-3 h-2 rounded-full bg-zinc-100"><div className="h-2 w-3/4 rounded-full bg-cyan-500" /></div></div>
                <div className="rounded-xl border border-zinc-200 p-4"><p className="text-xs font-semibold text-zinc-400">KNOWLEDGE</p><p className="mt-2 font-bold">NestJS Architecture</p><p className="mt-3 text-xs text-zinc-500">Dokumentasi tim · updated today</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Everything in one workspace</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Bukan sekadar task manager.</h2>
          <p className="mt-4 text-zinc-500">PDA dirancang sebagai workspace developer: pekerjaan, konteks, dokumentasi, dan reusable knowledge berada dalam satu alur.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-sm font-bold text-cyan-700">{feature.icon}</div>
              <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="cara-kerja" className="bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Simple workflow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Dari ide sampai selesai, tetap terhubung.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">Buat workspace, susun project, pecah pekerjaan menjadi task, lalu simpan pengetahuan dan code yang kamu gunakan berulang kali.</p>
          </div>
          <div className="grid gap-4">
            {[
              ['01', 'Buat Workspace', 'Pisahkan konteks pekerjaan pribadi, freelance, atau tim.'],
              ['02', 'Susun Project & Task', 'Atur pekerjaan dengan prioritas, deadline, assignee, dan Kanban.'],
              ['03', 'Simpan Knowledge', 'Dokumentasikan keputusan, catatan teknis, snippet, dan dokumen.'],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="text-sm font-black text-cyan-400">{number}</span>
                <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="harga" className="bg-[#f7f8fc]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Pricing</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Harga sederhana, mulai dari gratis.</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">Paket berikut adalah rancangan harga awal untuk produk PDA dan dapat disesuaikan sebelum billing resmi diaktifkan.</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {plans.map((plan) => (
              <div key={plan.name} className={'relative rounded-3xl border bg-white p-6 shadow-sm ' + (plan.featured ? 'border-cyan-400 ring-2 ring-cyan-100' : 'border-zinc-200')}>
                {plan.featured ? <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Paling populer</div> : null}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="mt-2 min-h-12 text-xs leading-5 text-zinc-500">{plan.description}</p>
                <div className="mt-5"><span className="text-3xl font-black tracking-tight">{plan.price}</span><span className="ml-1 text-xs text-zinc-400">{plan.period}</span></div>
                <Link href={plan.href} className={'mt-6 flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ' + (plan.featured ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50')}>{plan.cta}</Link>
                <ul className="mt-6 space-y-3 border-t border-zinc-100 pt-6">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-zinc-600"><span className="font-bold text-emerald-500">✓</span>{feature}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <div className="rounded-[2rem] bg-zinc-950 px-6 py-12 text-white sm:px-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Ready to build?</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Rapikan workflow development kamu hari ini.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-400">Mulai dari workspace kecil. Kembangkan bersama tim saat kebutuhan kamu bertambah.</p>
          <Link href="/register" className="mt-7 inline-flex rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-zinc-950 transition hover:bg-zinc-100">Buat Akun Gratis →</Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="font-semibold text-zinc-800">Personal Developer Assistant</div>
          <div>Developer workspace untuk project, task, knowledge, snippets, dan documents.</div>
        </div>
      </footer>
    </main>
  );
}