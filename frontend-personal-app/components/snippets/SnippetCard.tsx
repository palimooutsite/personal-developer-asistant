'use client';

import { useState } from 'react';
import type { CodeSnippet, Tag } from '../../lib/snippets';

interface SnippetCardProps {
  snippet: CodeSnippet;
  tags: Tag[];
  allTags: Tag[];
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleTag: (tag: Tag) => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript', javascript: 'JavaScript', tsx: 'TSX', python: 'Python',
  sql: 'SQL', php: 'PHP', java: 'Java', csharp: 'C#', go: 'Go', rust: 'Rust',
  bash: 'Bash', json: 'JSON', html: 'HTML', css: 'CSS',
};

export function SnippetCard({
  snippet,
  tags,
  allTags,
  onEdit,
  onDelete,
  onToggleTag,
}: SnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const attached = new Set(tags.map(tag => tag.id));

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-emerald-700">
              {LANGUAGE_LABELS[snippet.language.toLowerCase()] ?? snippet.language}
            </span>
            <span className="text-[11px] text-zinc-400">
              {new Date(snippet.updatedAt).toLocaleDateString('id-ID')}
            </span>
          </div>
          <h3 className="truncate text-base font-bold text-zinc-900">{snippet.title}</h3>
        </div>

        <button type="button" onClick={() => void copyCode()}
          className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {snippet.description ? (
        <p className="px-5 pt-4 text-sm leading-6 text-zinc-500">{snippet.description}</p>
      ) : null}

      <div className="mx-5 mt-4 overflow-hidden rounded-xl bg-zinc-950">
        <pre className="max-h-60 overflow-auto p-4 font-mono text-[12px] leading-5 text-zinc-300"><code>{snippet.code}</code></pre>
      </div>

      <div className="px-5 py-4">
        {allTags.length ? (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button key={tag.id} type="button" onClick={() => onToggleTag(tag)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  attached.has(tag.id)
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100'
                }`}>
                {tag.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
          <span className="text-xs text-zinc-400">{tags.length} tag terpasang</span>
          <div className="flex gap-2">
            {onEdit ? <button type="button" onClick={onEdit} className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-100">Edit</button>
            {onDelete ? <button type="button" onClick={onDelete} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 focus:outline-none focus:ring-2 focus:ring-red-100">Hapus</button> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
