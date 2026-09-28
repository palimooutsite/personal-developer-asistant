import { apiRequest } from './api';
import { getActiveTenantId } from './tenant';

export interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function getDocuments() {
  return apiRequest<DocumentItem[]>('/documents');
}

export async function uploadDocument(
  file: File,
  title: string,
  description?: string,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  if (description?.trim()) formData.append('description', description.trim());

  return apiRequest<DocumentItem>('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export function getDocumentFileUrl(id: string) {
  return `/backend-api/documents/${id}/file`;
}

export async function openDocumentFile(id: string, fileName: string) {
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem('pda_access_token')
    : null;
  const tenantId = getActiveTenantId();

  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }

  const response = await fetch(getDocumentFileUrl(id), {
    headers,
  });

  if (!response.ok) {
    throw new Error('File document gagal dibuka.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function updateDocument(
  id: string,
  data: { title?: string; description?: string | null },
) {
  return apiRequest<DocumentItem>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(id: string) {
  return apiRequest<{ message: string }>(`/documents/${id}`, {
    method: 'DELETE',
  });
}
