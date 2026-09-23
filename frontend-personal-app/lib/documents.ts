import { apiRequest } from './api';

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
