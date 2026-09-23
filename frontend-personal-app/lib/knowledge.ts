import { apiRequest } from './api';

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Tag {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArticleTag {
  id: string;
  articleId: string;
  tagId: string;
  tag: { id: string; name: string };
  createdAt: string;
}

export async function getKnowledge(search = '', tag = '', page = 1, limit = 10) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search.trim()) params.set('search', search.trim());
  if (tag) params.set('tag', tag);
  return apiRequest<{ data: KnowledgeArticle[]; meta: KnowledgeMeta }>(`/knowledge?${params.toString()}`);
}

export async function createKnowledge(data: { title: string; slug: string; content: string; summary?: string }) {
  return apiRequest<KnowledgeArticle>('/knowledge', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateKnowledge(id: string, data: { title?: string; slug?: string; content?: string; summary?: string | null }) {
  return apiRequest<KnowledgeArticle>(`/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteKnowledge(id: string) {
  return apiRequest<{ message: string }>(`/knowledge/${id}`, { method: 'DELETE' });
}

export async function getTags() {
  return apiRequest<Tag[]>('/tags');
}

export async function getArticleTags(articleId: string) {
  return apiRequest<ArticleTag[]>(`/knowledge/${articleId}/tags`);
}

export async function addArticleTag(articleId: string, tagId: string) {
  return apiRequest<ArticleTag>(`/knowledge/${articleId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tagId }),
  });
}

export async function removeArticleTag(articleId: string, tagId: string) {
  return apiRequest<{ message: string }>(`/knowledge/${articleId}/tags/${tagId}`, { method: 'DELETE' });
}
