# 18 — Security Test Matrix

## 1. Tujuan

Baseline integration/security test untuk branch `dev/project-members-api`. Matrix ini memetakan kontrol yang harus diverifikasi setelah authorization dan quota changes.

Test runner backend tersedia melalui `vitest`, dengan script `test:e2e` menggunakan `vitest.config.e2e.ts`.

## 2. Authentication Matrix

| ID | Scenario | Expected | Current control |
|---|---|---|---|
| AUTH-01 | Request protected endpoint tanpa JWT | 401 | JwtAuthGuard |
| AUTH-02 | JWT invalid/expired | 401 | JwtAuthGuard |
| AUTH-03 | JWT valid | request lanjut | JwtAuthGuard |
| AUTH-04 | User A memakai tenant B tanpa membership | 403 | TenantContextGuard |
| AUTH-05 | X-Tenant-Id kosong | 403 | TenantContextGuard |

## 3. Permission Matrix

| ID | Scenario | Expected | Current control |
|---|---|---|---|
| PERM-01 | Member tanpa PROJECTS.READ GET /projects | 403 | PermissionGuard |
| PERM-02 | Member tanpa PROJECTS.CREATE POST /projects | 403 | PermissionGuard |
| PERM-03 | Member tanpa TASKS.UPDATE update task | 403 | PermissionGuard |
| PERM-04 | Member tanpa KNOWLEDGE.DELETE delete article | 403 | PermissionGuard |
| PERM-05 | Member tanpa CODE_SNIPPETS.UPDATE update snippet | 403 | PermissionGuard |
| PERM-06 | Member tanpa DOCUMENTS.CREATE upload document | 403 | PermissionGuard |
| PERM-07 | Member dengan permission yang benar | success | PermissionGuard + service |

## 4. Cross-Tenant Matrix

| ID | Scenario | Expected |
|---|---|---|
| TENANT-01 | User A membaca Project tenant B | 403/404 |
| TENANT-02 | User A update Project tenant B | 403/404 |
| TENANT-03 | User A membaca Task tenant B | 403/404 |
| TENANT-04 | User A membaca Knowledge tenant B | 403/404 |
| TENANT-05 | User A membaca Snippet tenant B | 403/404 |
| TENANT-06 | User A membaca Document tenant B | 403/404 |
| TENANT-07 | User A memakai Tag tenant B | 403/404 |
| TENANT-08 | User A memakai Article ID tenant B dengan Tag tenant A | must not mutate |

Expected principle: tenantId harus berasal dari TenantContext, dan service query harus membatasi tenant scope.

## 5. Ownership / Resource Authorization

| ID | Scenario | Expected | Current behavior to verify |
|---|---|---|---|
| OWN-01 | User A membuka Document milik User B dalam tenant sama | 404 | DocumentsService checks createdBy + tenantId |
| OWN-02 | User A update Document milik User B | 404 | same |
| OWN-03 | User A delete Document milik User B | 404 | same |
| OWN-04 | User A add Article Tag ke article milik User B | 404 currently | ArticleTagsService ownership check |
| OWN-05 | User A add Snippet Tag ke snippet milik User B | 404 currently | SnippetTagsService ownership check |

## 6. Billing / Quota Matrix

| ID | Scenario | Expected |
|---|---|---|
| BILL-01 | Create Document below limit | success |
| BILL-02 | Create Document at limit | 409 quota error |
| BILL-03 | Upload Document at limit | 409 quota error + physical file removed |
| BILL-04 | Upload Document below limit | success |
| BILL-05 | Add workspace member at limit | 409 WORKSPACE_MEMBER_LIMIT_REACHED |
| BILL-06 | Create invitation when member + pending invitation reaches limit | 409 WORKSPACE_MEMBER_LIMIT_REACHED |
| BILL-07 | Accept invitation when capacity disappeared | 409 WORKSPACE_MEMBER_LIMIT_REACHED |

## 7. File Upload Security Matrix

| ID | Scenario | Expected |
|---|---|---|
| FILE-01 | Upload unsupported MIME | 400 |
| FILE-02 | Upload > 10 MB document | rejected by Multer limit |
| FILE-03 | Quota rejection after Multer write | DB row not created + file removed |
| FILE-04 | DB failure after file write | DB row not created + file removed |
| FILE-05 | Read document file of another user | 404 |
| FILE-06 | Avatar unsupported MIME | rejected |
| FILE-07 | Avatar > 2 MB | rejected |

## 8. Tag Authorization Matrix — Pending Policy

| ID | Scenario | Current | Decision needed |
|---|---|---|---|
| TAG-01 | Member creates Tag | allowed if tenant member | Should permission be required? |
| TAG-02 | Member renames shared Tag | allowed if tenant member | Should permission be required? |
| TAG-03 | Member deletes shared Tag | allowed if tenant member and unused | Should permission be required? |
| TAG-04 | User modifies Article Tag of another user's article | denied by ownership | Keep ownership or use KNOWLEDGE.UPDATE? |
| TAG-05 | User modifies Snippet Tag of another user's snippet | denied by ownership | Keep ownership or use CODE_SNIPPETS.UPDATE? |

Do not automate TAG expected results as security regression tests until the policy is explicitly chosen.

## 9. Workspace Matrix

| ID | Scenario | Expected / Current |
|---|---|---|
| WS-01 | Non-member GET tenant detail | 403 |
| WS-02 | Member GET own effective permissions | success |
| WS-03 | Member GET member list | currently allowed |
| WS-04 | Unauthorized member update | service should reject |
| WS-05 | Unauthorized member remove | service should reject |
| WS-06 | Unauthorized invitation create | service should reject |
| WS-07 | Authorized member mutation | success |

## 10. Regression Tests After SEC-01

Minimum required tests after document quota patch:
1. Document limit reached + `/documents` POST → reject.
2. Document limit reached + `/documents/upload` → reject.
3. After upload rejection, verify no new Document row.
4. After upload rejection, verify uploaded physical file does not remain.
5. Below limit upload → Document row and physical file both exist.
6. Cross-tenant document access remains rejected.

## 11. Test Data Model

Recommended fixtures:
- User A / User B
- Tenant A / Tenant B
- Owner role
- Restricted member role
- Project permission variants
- Task permission variants
- Knowledge permission variants
- Snippet permission variants
- Document permission variants
- Subscription package with DOCUMENT limit 1
- Subscription package with WORKSPACE_MEMBER limit 1
- One pending invitation

Keep test tenants isolated and generate fresh IDs per test suite where practical.

## 12. Exit Criteria

Security changes should not be considered complete until:
- protected endpoints reject unauthenticated requests;
- cross-tenant access is rejected;
- permission-denied requests return 403;
- resource ownership rules are verified;
- quota limits apply consistently to every creation path;
- rejected file uploads leave no orphan files;
- tag authorization policy has explicit expected results;
- e2e tests pass after the final authorization changes.

## 13. Current Status

SEC-01 code fix has been committed. This document is the test baseline; it does not claim that all scenarios have already been executed.