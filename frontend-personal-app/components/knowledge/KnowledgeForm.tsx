import type { FormEvent } from 'react';

interface KnowledgeFormProps {
  editingId: string | null;
  title: string;
  slug: string;
  summary: string;
  content: string;
  saving: boolean;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export function KnowledgeForm({
  editingId, title, slug, summary, content, saving,
  onTitleChange, onSlugChange, onSummaryChange, onContentChange, onSubmit, onClose,
}: KnowledgeFormProps) {
  return (
    <section id="knowledge-form" className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{editingId ? 'Knowledge Article' : 'New Article'}</p>
        <h2 className="mt-1 text-xl font-bold">{editingId ? 'Edit Knowledge' : 'Buat Knowledge Baru'}</h2>
        <p className="mt-1 text-sm text-zinc-500">Simpan catatan teknis, solusi, dokumentasi, atau referensi development.</p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="knowledge-title" className="mb-2 block text-sm font-semibold">Judul <span className="text-red-500">*</span></label>
            <input id="knowledge-title" value={title} onChange={(e) => onTitleChange(e.target.value)} maxLength={200} required autoFocus className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50" placeholder="Contoh: Setup Prisma PostgreSQL" />
          </div>
          <div>
            <label htmlFor="knowledge-slug" className="mb-2 block text-sm font-semibold">Slug <span className="text-red-500">*</span></label>
            <input id="knowledge-slug" value={slug} onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))} maxLength={200} required className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50" placeholder="setup-prisma-postgresql" />
          </div>
        </div>
        <div>
          <label htmlFor="knowledge-summary" className="mb-2 block text-sm font-semibold">Ringkasan <span className="font-normal text-zinc-400">(opsional)</span></label>
          <textarea id="knowledge-summary" value={summary} onChange={(e) => onSummaryChange(e.target.value)} maxLength={500} rows={2} className="w-full resize-y rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50" placeholder="Ringkasan singkat artikel..." />
        </div>
        <div>
          <label htmlFor="knowledge-content" className="mb-2 block text-sm font-semibold">Content <span className="text-red-500">*</span></label>
          <textarea id="knowledge-content" value={content} onChange={(e) => onContentChange(e.target.value)} required rows={12} className="w-full resize-y rounded-xl border border-zinc-300 px-4 py-3 font-mono text-sm leading-6 outline-none transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50" placeholder="Tulis dokumentasi atau catatan teknis di sini..." />
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-violet-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Knowledge'}</button>
        </div>
      </form>
    </section>
  );
}
