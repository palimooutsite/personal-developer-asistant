import type { KnowledgeArticle } from '../../lib/knowledge';

interface KnowledgeReaderProps {
  article: KnowledgeArticle;
  tags: string[];
  onBack: () => void;
  onEdit: () => void;
}

export function KnowledgeReader({ article, tags, onBack, onEdit }: KnowledgeReaderProps) {
  const date = new Date(article.updatedAt).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <section className="flex max-h-[95vh] w-full flex-col overflow-hidden bg-white sm:max-w-5xl sm:rounded-2xl sm:shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/90 px-4 py-3 sm:px-6">
          <button type="button" onClick={onBack} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-900">
            ← Kembali
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onEdit} className="rounded-lg bg-violet-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-900">
              Edit
            </button>
            <button type="button" onClick={onBack} aria-label="Tutup" className="rounded-lg px-3 py-2 text-xl leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800">
              ×
            </button>
          </div>
        </div>

        <article className="overflow-y-auto">
          <div className="mx-auto max-w-4xl px-5 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-14">
            <header className="border-b border-zinc-100 pb-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Knowledge Article</p>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">{article.title}</h1>
              <p className="mt-3 text-sm text-zinc-400">/{article.slug} · Diperbarui {date}</p>
              {tags.length > 0 && <div className="mt-5 flex flex-wrap justify-center gap-2">{tags.map(tag => <span key={tag} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{tag}</span>)}</div>}
            </header>
            {article.summary && <div className="mt-10 rounded-2xl border-l-4 border-violet-300 bg-violet-50/60 px-5 py-4 sm:px-6"><p className="text-sm font-semibold leading-6 text-violet-950">{article.summary}</p></div>}
            <div className="mt-10 whitespace-pre-wrap break-words text-[16px] leading-8 text-zinc-700 sm:text-[17px] sm:leading-9">{article.content}</div>
            <footer className="mt-12 border-t border-zinc-100 pt-6 text-center text-xs text-zinc-400">Akhir artikel · Knowledge Base</footer>
          </div>
        </article>
      </section>
    </div>
  );
}
