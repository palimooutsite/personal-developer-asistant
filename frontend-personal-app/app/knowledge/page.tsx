'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../lib/api';
import {
  addArticleTag,
  createKnowledge,
  deleteKnowledge,
  getArticleTags,
  getKnowledge,
  getTags,
  KnowledgeArticle,
  Tag,
  removeArticleTag,
  updateKnowledge,
} from '../../lib/knowledge';
import { KnowledgeCard } from '../../components/knowledge/KnowledgeCard';
import { KnowledgeReader } from '../../components/knowledge/KnowledgeReader';
import { KnowledgeForm } from '../../components/knowledge/KnowledgeForm';
import { ModuleHeader } from '../../components/layout/ModuleHeader';
import { StyledSelect } from '../../components/ui/StyledSelect';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [articleTags, setArticleTags] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readingArticle, setReadingArticle] = useState<KnowledgeArticle | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeArticle | null>(null);
  const [toast, setToast] = useState('');

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getKnowledge(search, tagFilter, page, 10);
      setArticles(result.data);
      setMeta(result.meta);
      const entries = await Promise.all(result.data.map(async (article) => {
        const result = await getArticleTags(article.id);
        return [article.id, result.map((item) => item.tag.name)] as const;
      }));
      setArticleTags(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Knowledge gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [page, search, tagFilter]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    void getTags().then(setTags).catch(() => setTags([]));
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setSummary('');
    setContent('');
    setShowForm(false);
  }

  function openCreate() {
    setReadingArticle(null);
    resetForm();
    setShowForm(true);
  }

  function openEdit(article: KnowledgeArticle) {
    setReadingArticle(null);
    setEditingId(article.id);
    setTitle(article.title);
    setSlug(article.slug);
    setSummary(article.summary ?? '');
    setContent(article.content);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateKnowledge(editingId, { title, slug, summary: summary || null, content });
      } else {
        await createKnowledge({ title, slug, summary: summary || undefined, content });
      }
      resetForm();
      await loadArticles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Knowledge gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  function openReader(article: KnowledgeArticle) {
    setShowForm(false);
    setEditingId(null);
    setReadingArticle(article);
    setError('');
  }

  async function handleDelete(article: KnowledgeArticle) { setDeleteTarget(article); }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteKnowledge(deleteTarget.id);
      setDeleteTarget(null);
      setToast('Knowledge "' + deleteTarget.title + '" berhasil dihapus.');
      await loadArticles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Knowledge gagal dihapus.');
    }
  }

  async function toggleTag(articleId: string, tag: Tag) {
    const attached = (articleTags[articleId] ?? []).includes(tag.name);
    try {
      if (attached) await removeArticleTag(articleId, tag.id);
      else await addArticleTag(articleId, tag.id);
      await loadArticles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tag gagal diperbarui.');
    }
  }

  const tagOptions = [{ value: '', label: 'Semua Tag' }, ...tags.map((tag) => ({ value: tag.name, label: tag.name }))];

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 2xl:px-10 lg:py-10">
        <ModuleHeader
          icon="◈"
          label="KNOWLEDGE"
          title="Knowledge"
          subtitle="Knowledge Base"
          description="Simpan dokumentasi, catatan teknis, solusi, dan referensi development agar mudah ditemukan kembali."
          accent="violet"
          action={
            <button type="button" onClick={openCreate} className="w-full rounded-xl bg-violet-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-900 sm:w-auto">
              + Knowledge Baru
            </button>
          }
        />

        {error && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadArticles()}
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Memuat...' : 'Coba lagi'}
            </button>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <div className="max-h-[95vh] w-full overflow-y-auto sm:max-w-4xl sm:rounded-2xl">
              <KnowledgeForm
            editingId={editingId}
            title={title}
            slug={slug}
            summary={summary}
            content={content}
            saving={saving}
            onTitleChange={setTitle}
            onSlugChange={setSlug}
            onSummaryChange={setSummary}
            onContentChange={setContent}
            onSubmit={handleSubmit}
            onClose={resetForm}
          />
            </div>
          </div>
        )}

        {readingArticle && !showForm && (
          <KnowledgeReader
            article={readingArticle}
            tags={articleTags[readingArticle.id] ?? []}
            onBack={() => setReadingArticle(null)}
            onEdit={() => openEdit(readingArticle)}
          />
        )}

        <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari judul, slug, atau isi knowledge..." className="rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-50" />
            <StyledSelect value={tagFilter} onChange={(value) => { setTagFilter(value); setPage(1); }} options={tagOptions} />
            <div className="flex items-center justify-center rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 md:justify-start">{meta.total} artikel</div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1,2,3,4].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100/70" />)}
          </div>
        ) : articles.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-xl font-bold text-violet-600">◈</div>
            <h2 className="mt-4 text-lg font-bold">Belum ada knowledge</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Buat artikel pertama untuk mulai membangun knowledge base kamu.</p>
            <button type="button" onClick={openCreate} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-100">Buat Knowledge</button>
          </section>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {articles.map((article) => (
                <div key={article.id}>
                  <KnowledgeCard
                    article={article}
                    tags={articleTags[article.id] ?? []}
                    onOpen={() => openReader(article)}
                    onEdit={() => openEdit(article)}
                    onDelete={() => void handleDelete(article)}
                  />
                  {tags.length > 0 && (
                    <div className="mt-2 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const attached = (articleTags[article.id] ?? []).includes(tag.name);
                          return (
                            <button key={tag.id} type="button" onClick={() => void toggleTag(article.id, tag)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${attached ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-200' : 'bg-zinc-100 text-zinc-500 hover:bg-violet-50 hover:text-violet-600'}`}>
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {meta.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <p className="text-sm text-zinc-500">Halaman {meta.page} dari {meta.totalPages}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40">← Sebelumnya</button>
                  <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog open={Boolean(deleteTarget)} title="Hapus knowledge?" description={deleteTarget ? 'Artikel "' + deleteTarget.title + '" akan dihapus dan tidak dapat dikembalikan.' : ''} onClose={()=>setDeleteTarget(null)} onConfirm={()=>void confirmDelete()} />
      <Toast message={toast} open={Boolean(toast)} onClose={()=>setToast('')} />
    </main>
  );
}
