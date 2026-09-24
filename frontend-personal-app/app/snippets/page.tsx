'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ModuleHeader } from '../../components/layout/ModuleHeader';
import { Modal } from '../../components/ui/Modal';
import { StyledSelect } from '../../components/ui/StyledSelect';
import { SnippetCard } from '../../components/snippets/SnippetCard';
import { SnippetForm, type SnippetFormValue } from '../../components/snippets/SnippetForm';
import {
  addSnippetTag,
  createSnippet,
  deleteSnippet,
  getSnippetTags,
  getSnippets,
  getTags,
  removeSnippetTag,
  updateSnippet,
  type CodeSnippet,
  type Tag,
} from '../../lib/snippets';
import { ApiError } from '../../lib/api';

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Semua bahasa', icon: '</>' },
  { value: 'typescript', label: 'TypeScript', icon: 'TS' },
  { value: 'javascript', label: 'JavaScript', icon: 'JS' },
  { value: 'tsx', label: 'TSX / React', icon: 'R' },
  { value: 'python', label: 'Python', icon: 'Py' },
  { value: 'sql', label: 'SQL', icon: 'DB' },
  { value: 'csharp', label: 'C#', icon: 'C#' },
  { value: 'java', label: 'Java', icon: 'J' },
  { value: 'php', label: 'PHP', icon: 'PHP' },
  { value: 'go', label: 'Go', icon: 'Go' },
  { value: 'rust', label: 'Rust', icon: 'Rs' },
  { value: 'bash', label: 'Bash / Shell', icon: '$' },
  { value: 'json', label: 'JSON', icon: '{}' },
  { value: 'html', label: 'HTML', icon: '<>' },
  { value: 'css', label: 'CSS', icon: '#' },
  { value: 'other', label: 'Other', icon: '…' },
];

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [snippetTags, setSnippetTags] = useState<Record<string, Tag[]>>({});
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CodeSnippet | null>(null);
  const [error, setError] = useState('');

  const loadSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const [snippetResult, tagResult] = await Promise.all([
        getSnippets(search, language, page, 12),
        getTags(),
      ]);

      setSnippets(snippetResult.data);
      setMeta(snippetResult.meta);
      setTags(tagResult);

      const tagEntries = await Promise.all(
        snippetResult.data.map(async snippet => [snippet.id, await getSnippetTags(snippet.id)] as const),
      );

      const nextTags: Record<string, Tag[]> = {};
      for (const [snippetId, rows] of tagEntries) {
        nextTags[snippetId] = rows.map(row => row.tag);
      }
      setSnippetTags(nextTags);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code snippets gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [language, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSnippets(), 250);
    return () => window.clearTimeout(timer);
  }, [loadSnippets]);

  const languageCount = useMemo(
    () => new Set(snippets.map(snippet => snippet.language.toLowerCase())).size,
    [snippets],
  );

  function startCreate() {
    setEditing(null);
    setShowForm(true);
    setError('');
  }

  function startEdit(snippet: CodeSnippet) {
    setEditing(snippet);
    setShowForm(true);
    setError('');
  }

  async function handleSave(value: SnippetFormValue) {
    setSaving(true);
    try {
      if (editing) {
        await updateSnippet(editing.id, value);
      } else {
        await createSnippet(value);
      }
      setShowForm(false);
      setEditing(null);
      await loadSnippets();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(snippet: CodeSnippet) {
    if (!window.confirm(`Hapus code snippet "${snippet.title}"?`)) return;

    try {
      await deleteSnippet(snippet.id);
      if (snippets.length === 1 && page > 1) setPage(current => current - 1);
      else await loadSnippets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code snippet gagal dihapus.');
    }
  }

  async function toggleTag(snippetId: string, tag: Tag) {
    const attached = (snippetTags[snippetId] ?? []).some(item => item.id === tag.id);
    try {
      if (attached) await removeSnippetTag(snippetId, tag.id);
      else await addSnippetTag(snippetId, tag.id);

      const rows = await getSnippetTags(snippetId);
      setSnippetTags(current => ({
        ...current,
        [snippetId]: rows.map(row => row.tag),
      }));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tag gagal diperbarui.');
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 2xl:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <ModuleHeader
          icon="</>"
          label="SNIPPETS"
          title="Code Snippets"
          subtitle="Reusable Code Library"
          description="Simpan, cari, dan kelola potongan kode yang sering digunakan agar workflow development lebih cepat."
          accent="emerald"
          action={
            <button type="button" onClick={startCreate}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md sm:w-auto">
              + Snippet Baru
            </button>
          }
        />

        <Modal
          open={showForm}
          onClose={() => { setShowForm(false); setEditing(null); }}
          title={editing ? 'Edit Code Snippet' : 'Code Snippet Baru'}
          description="Simpan potongan kode agar mudah ditemukan dan digunakan kembali."
          maxWidth="xl"
        >
          <SnippetForm
            initialValue={editing ?? undefined}
            onSubmit={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            submitting={saving}
          />
        </Modal>

        {error ? (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="font-bold text-red-400 hover:text-red-700">×</button>
          </div>
        ) : null}

        <section className="mb-7 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
              <input
                value={search}
                onChange={event => { setSearch(event.target.value); setPage(1); }}
                placeholder="Cari judul, bahasa, deskripsi, atau isi kode..."
                className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />
            </div>
            <div className="w-full lg:w-64">
              <StyledSelect
                value={language}
                onChange={value => { setLanguage(value); setPage(1); }}
                options={LANGUAGE_OPTIONS}
                ariaLabel="Filter bahasa"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{meta.total} snippet</span>
            <span className="rounded-full bg-zinc-100 px-3 py-1.5">{languageCount} bahasa di halaman ini</span>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[430px] animate-pulse rounded-2xl border border-zinc-200 bg-white" />
            ))}
          </div>
        ) : snippets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 font-mono text-xl font-bold text-emerald-600">&lt;/&gt;</div>
            <h2 className="mt-4 text-lg font-bold text-zinc-900">Belum ada code snippet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Mulai simpan potongan kode yang sering Anda gunakan supaya bisa ditemukan kembali dengan cepat.
            </p>
            <button type="button" onClick={startCreate}
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">
              + Buat Snippet Pertama
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {snippets.map(snippet => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  tags={snippetTags[snippet.id] ?? []}
                  allTags={tags}
                  onEdit={() => startEdit(snippet)}
                  onDelete={() => void handleDelete(snippet)}
                  onToggleTag={tag => void toggleTag(snippet.id, tag)}
                />
              ))}
            </div>

            {meta.totalPages > 1 ? (
              <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-zinc-500">Halaman {meta.page} dari {meta.totalPages}</span>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button type="button" disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
                  <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage(current => Math.min(meta.totalPages, current + 1))}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
