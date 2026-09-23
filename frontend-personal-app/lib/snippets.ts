import { apiRequest } from './api';

export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnippetMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface SnippetTag {
  id: string;
  snippetId: string;
  tagId: string;
  tag: { id: string; name: string };
  createdAt: string;
}

export async function getSnippets(
  search = '',
  language = '',
  page = 1,
  limit = 12,
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) params.set('search', search.trim());
  if (language) params.set('language', language);

  return apiRequest<{ data: CodeSnippet[]; meta: SnippetMeta }>(
    `/snippets?${params.toString()}`,
  );
}

export async function createSnippet(data: {
  title: string;
  language: string;
  code: string;
  description?: string;
}) {
  return apiRequest<CodeSnippet>('/snippets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSnippet(
  id: string,
  data: {
    title?: string;
    language?: string;
    code?: string;
    description?: string | null;
  },
) {
  return apiRequest<CodeSnippet>(`/snippets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSnippet(id: string) {
  return apiRequest<{ message: string }>(`/snippets/${id}`, {
    method: 'DELETE',
  });
}

export async function getTags() {
  return apiRequest<Tag[]>('/tags');
}

export async function getSnippetTags(snippetId: string) {
  return apiRequest<SnippetTag[]>(`/snippets/${snippetId}/tags`);
}

export async function addSnippetTag(snippetId: string, tagId: string) {
  return apiRequest<SnippetTag>(`/snippets/${snippetId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tagId }),
  });
}

export async function removeSnippetTag(snippetId: string, tagId: string) {
  return apiRequest<{ message: string }>(
    `/snippets/${snippetId}/tags/${tagId}`,
    { method: 'DELETE' },
  );
}
