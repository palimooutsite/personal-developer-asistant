'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModuleHeader } from '../../components/layout/ModuleHeader';
import { Modal } from '../../components/ui/Modal';
import { DocumentCard } from '../../components/documents/DocumentCard';
import { DocumentForm } from '../../components/documents/DocumentForm';
import { DocumentEditForm } from '../../components/documents/DocumentEditForm';
import { ApiError } from '../../lib/api';
import {
  deleteDocument,
  getDocuments,
  openDocumentFile,
  updateDocument,
  uploadDocument,
  type DocumentItem,
} from '../../lib/documents';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadDocuments() {
    setLoading(true);
    try {
      setDocuments(await getDocuments());
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Documents gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return documents;
    return documents.filter(document =>
      [document.title, document.fileName, document.description ?? '', document.mimeType]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [documents, search]);

  function startCreate() {
    setEditing(null);
    setShowForm(true);
    setError('');
  }

  function startEdit(document: DocumentItem) {
    setEditing(document);
    setShowForm(false);
    setError('');
  }

  async function saveEdit(id: string, title: string, description: string) {
    if (!title.trim()) {
      setError('Judul document wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await updateDocument(id, { title: title.trim(), description: description.trim() || null });
      await loadDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Document gagal diperbarui.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File, title: string, description: string) {
    setSaving(true);
    try {
      await uploadDocument(file, title, description);
      setShowForm(false);
      await loadDocuments();
    } finally {
      setSaving(false);
    }
  }

  async function handleOpen(document: DocumentItem) {
    setError('');
    try {
      await openDocumentFile(document.id, document.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File document gagal dibuka.');
    }
  }

  async function handleDelete(document: DocumentItem) {
    if (!window.confirm(`Hapus document "${document.title}"?`)) return;

    setSaving(true);
    try {
      await deleteDocument(document.id);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Document gagal dihapus.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 2xl:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <ModuleHeader
          icon="▤"
          label="DOCUMENTS"
          title="Documents"
          subtitle="Document Management"
          description="Simpan dokumentasi, referensi, dan file project penting dalam satu tempat."
          accent="amber"
          action={
            <button type="button" onClick={startCreate}
              className="w-full rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 hover:shadow-md sm:w-auto">
              + Upload Document
            </button>
          }
        />

        <Modal
          open={showForm || Boolean(editing)}
          onClose={() => { setShowForm(false); setEditing(null); }}
          title={editing ? 'Edit Document' : 'Upload Document'}
          description={editing ? 'Perbarui informasi document tanpa mengubah file.' : 'Format yang didukung: PDF, DOCX, TXT, dan Markdown. Maksimal 10 MB.'}
          maxWidth="lg"
        >
          {editing ? (
            <DocumentEditForm
              document={editing}
              onSubmit={async (title, description) => {
                await saveEdit(editing.id, title, description);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
              submitting={saving}
            />
          ) : (
            <DocumentForm
              onSubmit={handleUpload}
              onCancel={() => setShowForm(false)}
              submitting={saving}
            />
          )}
        </Modal>

        {error ? (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="font-bold text-red-400 hover:text-red-700">×</button>
          </div>
        ) : null}

        <section className="mb-7 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
            <input value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Cari document, nama file, deskripsi..."
              className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50" />
          </div>
          <div className="mt-4 flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap">
            <span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">{filtered.length} document</span>
            {search ? <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-500">Filter: {search}</span> : null}
          </div>
        </section>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600">▤</div>
            <h2 className="mt-4 text-lg font-bold text-zinc-900">{search ? 'Document tidak ditemukan' : 'Belum ada document'}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {search ? 'Coba gunakan kata kunci pencarian yang berbeda.' : 'Upload document pertama Anda untuk mulai membangun document library.'}
            </p>
            {!search ? (
              <button type="button" onClick={startCreate}
                className="mt-5 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700">
                + Upload Document
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(document => (
              <DocumentCard
                key={document.id}
                document={document}
                onEdit={() => startEdit(document)}
                onDelete={() => void handleDelete(document)}
                onOpen={() => void handleOpen(document)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
