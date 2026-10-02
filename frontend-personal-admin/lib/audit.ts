import { apiRequest } from "./api";

export interface AdminAuditLog {
  id: string; userId: string | null; userName: string | null; userEmail: string | null;
  tenantId: string | null; workspaceName: string | null; action: string; entity: string;
  entityId: string | null; description: string | null; metadata: unknown;
  ipAddress: string | null; userAgent: string | null; createdAt: string;
}

export function listAuditLogs(filters: { q?: string; action?: string; entity?: string; tenantId?: string; userId?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  const query = params.toString();
  return apiRequest<AdminAuditLog[]>(`/audit-logs${query ? `?${query}` : ""}`);
}

export function getAuditLog(id: string) { return apiRequest<AdminAuditLog | null>(`/audit-logs/${id}`); }