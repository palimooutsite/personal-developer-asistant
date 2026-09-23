'use client';

import { useState } from 'react';
import type { DocumentItem } from '../../lib/documents';

interface DocumentCardProps {
  document: DocumentItem;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}

export function DocumentCard({ document, onEdit, onDelete }: DocumentCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(document.fileName);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  const icon = document.mimeType === 'application/pdf'
    ? 'PDF'
    : document.mimeType.includes('word')
      ? 'DOC'
      : document.mimeType === 'text/markdown'
        ? 'MD'
        : 'TXT';

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 font-mono text-xs font-bold text-amber-700">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-zinc-900">{document.title}</h3>
          <p className="mt-1 truncate font-mono text-xs text-zinc-400">{document.fileName}</p>
        </div>
      </div>

      {document.description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-500">{document.description}</p>
      ) : (
        <p className="mt-4 text-sm italic text-zinc-400">Tidak ada deskripsi.</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ukuran</p>
          <p className="mt-1 text-xs font-semibold text-zinc-700">{formatSize(Number(document.fileSize))}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Diunggah</p>
          <p className="mt-1 text-xs font-semibold text-zinc-700">{new Date(document.createdAt).toLocaleDateString('id-ID')}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
        <button type="button" onClick={onOpen}
          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">
          Buka / Download
        </button>
        <button type="button" onClick={() => void copyPath()}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800">
          {copied ? '✓ Nama disalin' : 'Salin nama'}
        </button>
        <button type="button" onClick={onEdit}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">Edit</button>
        <button type="button" onClick={onDelete}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600">Hapus</button>
      </div>
    </article>
  );
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
