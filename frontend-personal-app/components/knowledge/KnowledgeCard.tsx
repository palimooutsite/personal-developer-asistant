import type { KnowledgeArticle } from '../../lib/knowledge';

interface KnowledgeCardProps {
  article: KnowledgeArticle;
  tags: string[];
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function KnowledgeCard({ article, tags, onOpen, onEdit, onDelete }: KnowledgeCardProps) {
  const date = new Date(article.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const preview = article.summary || article.content.replace(/\s+/g, ' ').slice(0, 180);

  return (
    <article className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-600">◈</div>
          <div className="min-w-0">
            <button type="button" onClick={onOpen} className="block max-w-full truncate text-left font-bold text-zinc-900 hover:text-violet-700">{article.title}</button>
            <p className="mt-0.5 truncate text-xs text-zinc-400">/{article.slug}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 sm:flex">
          {onEdit ? <button type="button" onClick={onEdit} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-100">Edit</button>
          {onDelete ? <button type="button" onClick={onDelete} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 focus:outline-none focus:ring-2 focus:ring-red-100">Hapus</button> : null}
        </div>
      </div>
      <button type="button" onClick={onOpen} className="mt-4 block w-full text-left"><p className="line-clamp-3 text-sm leading-6 text-zinc-500">{preview}</p><span className="mt-3 inline-flex text-xs font-semibold text-violet-600">Baca selengkapnya →</span></button>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {tags.map((tag) => <span key={tag} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{tag}</span>)}
        {tags.length === 0 && <span className="text-xs text-zinc-400">Belum ada tag</span>}
        <span className="ml-auto text-xs text-zinc-400">{date}</span>
      </div>
    </article>
  );
}
