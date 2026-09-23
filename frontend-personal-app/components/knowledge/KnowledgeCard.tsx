import type { KnowledgeArticle } from '../../lib/knowledge';

interface KnowledgeCardProps {
  article: KnowledgeArticle;
  tags: string[];
  onEdit: () => void;
  onDelete: () => void;
}

export function KnowledgeCard({ article, tags, onEdit, onDelete }: KnowledgeCardProps) {
  const date = new Date(article.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const preview = article.summary || article.content.replace(/\s+/g, ' ').slice(0, 180);

  return (
    <article className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-600">◈</div>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-zinc-900">{article.title}</h3>
            <p className="mt-0.5 truncate text-xs text-zinc-400">/{article.slug}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">Edit</button>
          <button type="button" onClick={onDelete} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">Hapus</button>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-500">{preview}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {tags.map((tag) => <span key={tag} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{tag}</span>)}
        {tags.length === 0 && <span className="text-xs text-zinc-400">Belum ada tag</span>}
        <span className="ml-auto text-xs text-zinc-400">{date}</span>
      </div>
    </article>
  );
}
