# 15 — API Frontend Backend Map

## 1. Tujuan

Dokumen ini adalah peta tracing end-to-end untuk branch dev/project-members-api.

Pola utama:

Page → Component / Handler → frontend lib/*.ts → apiRequest() → /backend-api rewrite → NestJS Controller → Guard / Permission → Service → Prisma Contract / ORM → PostgreSQL

Gunakan dokumen ini untuk menemukan lokasi pertama yang gagal ketika fitur tidak bekerja.

## 2. Request Layer Frontend

frontend-personal-app/lib/api.ts

Semua request utama menggunakan apiRequest(path, options). Fungsi ini membaca JWT dari localStorage.pda_access_token, membaca tenant aktif dari pda_active_tenant_id, mengirim Authorization: Bearer ..., mengirim X-Tenant-Id, menggunakan prefix /backend-api, memproses JSON response, mengubah error menjadi ApiError, dan redirect ke /login ketika menerima 401 pada protected route.

Development: Browser → /backend-api/* → Next.js rewrite → http://localhost:3002/*

## 3. Authentication

Controller: backend-personal-app/src/auth/auth.controller.ts

Register/Login:
Page → auth helper → /auth/login atau /auth/register → AuthController → AuthService → User → PostgreSQL

Current user:
Authenticated Page → auth/user helper → GET /auth/me → AuthController → JwtAuthGuard → UsersService.findById() → User

Profile/password/avatar:
Account Settings → auth/account helper → /auth/profile, /auth/password, /auth/avatar, /auth/avatar/remove → AuthController → JwtAuthGuard → AuthService / UsersService → User

Avatar storage: uploads/avatars/

## 4. Workspace / Tenant

Controller: backend-personal-app/src/tenants/tenant.controller.ts
Service: backend-personal-app/src/tenants/tenant.service.ts

Workspace list: Workspace Selection → GET /tenants → TenantController → JwtAuthGuard → TenantService.findAll() → TenantMember → Tenant

Create workspace: Workspace UI → POST /tenants → TenantController → JwtAuthGuard → TenantService.create() → transaction → Tenant + TenantCustomRole + TenantRolePermission + TenantMember → AuditService

Active tenant context: TenantProvider → pda_active_tenant_id → apiRequest() → X-Tenant-Id → TenantContextGuard → TenantRequest.tenant.tenantId

Permissions: Workspace Settings → GET /tenants/:id/permissions → TenantController → JwtAuthGuard + TenantContextGuard → TenantService.getPermissions() → TenantMember + TenantCustomRole + TenantRolePermission

## 5. Workspace Members

List: Members UI → GET /tenants/:id/members → TenantController → TenantService.findMembers() → TenantMember + User + TenantCustomRole

Add: Member UI → POST /tenants/:id/members → TenantController → TenantService.addMember() → permission check → assertWorkspaceMemberCapacity() → TenantMember → AuditService

Update role: Member UI → PATCH /tenants/:id/members/:userId → TenantService.updateMemberRole() → workspace permission → TenantCustomRole → TenantMember

Remove: Member UI → DELETE /tenants/:id/members/:userId → TenantService.removeMember() → workspace permission → TenantMember.delete() → AuditService

Invitation create: Invite UI → POST /tenants/:id/invitations → TenantService.createInvitation() → capacity check → TenantInvitation → EmailService

Invitation accept: Invitation Accept Page → POST /tenants/invitations/accept → TenantService.acceptInvitation() → email ownership check → capacity check → TenantMember.create() → TenantInvitation.acceptedAt → AuditService

## 6. Custom Roles

Controller: backend-personal-app/src/tenants/roles/tenant-role.controller.ts

Workspace Settings → /tenants/:tenantId/roles → JwtAuthGuard → TenantContextGuard → PermissionGuard → RequirePermission(WORKSPACE_SETTINGS, action) → TenantRoleService → TenantCustomRole / TenantRolePermission

Operations: GET roles, POST role, GET detail, PATCH role, DELETE role, POST migrate-legacy-members.

## 7. Projects

Frontend: frontend-personal-app/lib/projects.ts
Backend: backend-personal-app/src/projects/projects.controller.ts and projects.service.ts

Projects Page → lib/projects.ts → /projects → ProjectsController → JwtAuthGuard → TenantContextGuard → PermissionGuard → RequirePermission(PROJECTS, action) → ProjectsService → Project → PostgreSQL

Endpoints: GET /projects, GET /projects/:id, POST /projects, PATCH /projects/:id, DELETE /projects/:id

Project members: Project Members UI → lib/projects.ts → /projects/:id/members* → ProjectsController → PROJECT_MEMBERS permission → ProjectsService → ProjectMember → User

Operations: list, add one, add bulk, update role, remove.

## 8. Tasks

Frontend: frontend-personal-app/lib/tasks.ts
Backend: backend-personal-app/src/tasks/tasks.controller.ts
Route root: /projects/:projectId/tasks

Tasks Page / Kanban → lib/tasks.ts → TasksController → JwtAuthGuard → TenantContextGuard → PermissionGuard → RequirePermission(TASKS, action) → TasksService → Task → PostgreSQL

Operations: GET list, GET detail, POST task, PATCH task, DELETE task, GET assignees, POST assignee, DELETE assignee.

Task assignee persistence: TaskAssignee → Task + ProjectMember.

## 9. Knowledge

Frontend: frontend-personal-app/lib/knowledge.ts
Backend: backend-personal-app/src/knowledge/knowledge.controller.ts

Knowledge Page → lib/knowledge.ts → /knowledge → KnowledgeController → JwtAuthGuard → TenantContextGuard → PermissionGuard → RequirePermission(KNOWLEDGE, action) → KnowledgeService → KnowledgeArticle → PostgreSQL

Operations: list/search/pagination, create, detail, update, delete.

Article tags: Knowledge UI → /knowledge/:articleId/tags → ArticleTagsController → JwtAuthGuard + TenantContextGuard → ArticleTagsService → KnowledgeArticleTag → Tag

Generic tags: Knowledge/Snippet UI → /tags → TagsController → JwtAuthGuard + TenantContextGuard → TagsService → Tag

Security note: tag controllers currently do not use PermissionGuard.

## 10. Code Snippets

Frontend: frontend-personal-app/lib/snippets.ts
Backend: backend-personal-app/src/snippets/snippets.controller.ts

Snippets Page → lib/snippets.ts → /snippets → SnippetsController → JwtAuthGuard → TenantContextGuard → PermissionGuard → RequirePermission(CODE_SNIPPETS, action) → SnippetsService → CodeSnippet

Tag flow: Snippet UI → /snippets/:snippetId/tags → SnippetTagsController → JwtAuthGuard + TenantContextGuard → SnippetTagsService → SnippetTag → Tag

## 11. Documents

Frontend: frontend-personal-app/lib/documents.ts
Backend: backend-personal-app/src/documents/documents.controller.ts

Documents Page → lib/documents.ts → /documents → DocumentsController → JwtAuthGuard → TenantContextGuard → PermissionGuard → RequirePermission(DOCUMENTS, action) → DocumentsService → Document → PostgreSQL

Upload: DocumentForm → FormData → POST /documents/upload → Multer → storage/documents/ → DocumentsService.upload() → Document record

Controller allows PDF, DOCX, TXT, Markdown; maximum 10 MB.

File read: DocumentCard → openDocumentFile() → GET /documents/:id/file → DocumentsController.file() → DocumentsService.getFile() → filesystem stream

Database stores document metadata/path; actual file is stored in filesystem.

## 12. Billing

Frontend: frontend-personal-app/lib/billing.ts
Main page: frontend-personal-app/app/billing/page.tsx

Billing page loads getBillingPackages(), getCurrentSubscription(activeTenantId), and getBillingUsage(activeTenantId) in parallel.

Catalog: Billing Page → getBillingPackages() → GET /billing/catalog/packages → Catalog Controller → BillingCatalogService → SubscriptionPackage + Price + Feature

Current subscription: Billing Page → getCurrentSubscription(tenantId) → GET /billing/tenants/:tenantId/subscription → Subscription Controller → BillingSubscriptionService → TenantSubscription

Usage: Billing Page → getBillingUsage(tenantId) → GET /billing/tenants/:tenantId/features → Feature Controller → BillingFeatureService → TenantSubscription + SubscriptionPackageFeature + usage queries

Current source gap: WORKSPACE_MEMBER is enforced by TenantService, but BillingFeatureService.listSubscriptionFeatures() does not currently calculate its usage.

Existing tenant checkout: Billing Checkout Page → createBillingCheckout() → POST /billing/tenants/:tenantId/checkout → Checkout Controller → Checkout Service → package/price + discount → TenantSubscription + SubscriptionInvoice + Payment

Sandbox payment: Payment Page → sandboxSucceedPayment() → POST /billing/tenants/:tenantId/payments/:paymentId/sandbox/succeed → PaymentService → Payment / Invoice / Subscription state

Pre-tenant checkout: Checkout Session → createBillingCheckoutSession() → POST /billing/checkout-sessions → CheckoutSession Controller → CheckoutSessionService → BillingCheckoutSession

## 13. Platform Admin

Separate frontend: frontend-personal-admin

Admin Page → admin lib/*.ts → /backend-api/billing/admin/* → Admin Billing Controller → JwtAuthGuard → PlatformAdminGuard → Admin Service → billing tables

Read-only operational views include subscriptions, invoices, payments, and audit logs.

Platform admin identity originates from User.isPlatformAdmin.

## 14. Audit

Business Service → AuditService.create() → AuditLog → PostgreSQL

Audit record may contain userId, tenantId, action, entity, entityId, description, metadata, ipAddress, userAgent, createdAt.

Admin Audit Page → admin audit lib → AuditController → AuditService.findAll/findOne → AuditLog → User/Tenant enrichment

Technical note: audit write failures are caught and logged rather than propagated.

## 15. Database Map

Identity: User → Tenant.createdBy, TenantMember.userId, TenantInvitation.invitedBy, Project.createdBy, ProjectMember.userId, Task.createdBy, KnowledgeArticle.createdBy, CodeSnippet.createdBy, Document.createdBy

Workspace: Tenant → TenantMember, TenantInvitation, TenantCustomRole, Project, Task, KnowledgeArticle, Tag, CodeSnippet, Document, TenantSubscription, SubscriptionInvoice, Payment, DiscountUsage

Project / Task: Project → ProjectMember + Task → TaskAssignee → ProjectMember

Knowledge: KnowledgeArticle → KnowledgeArticleTag → Tag

Snippet: CodeSnippet → SnippetTag → Tag

Billing: SubscriptionPackage → SubscriptionPackagePrice + SubscriptionPackageFeature + DiscountPackage → Discount; TenantSubscription → SubscriptionInvoice → InvoiceDiscount and Payment; BillingCheckoutSession is standalone in the contract.

## 16. Debugging

When a frontend button fails:
1. Browser: inspect handler, state, and Network.
2. lib: inspect frontend-personal-app/lib/*.ts for path, method, body, tenant.
3. Controller: inspect matching NestJS route, guards, and RequirePermission.
4. Service: inspect tenantId, userId, authorization, validation, business rules.
5. Database: inspect Prisma Contract, relation, query filter, and tenantId.

HTTP guide: 401 = auth/token layer; 403 = tenant/permission layer; 409 = business rule/conflict; 404 = route/resource layer; 500 = service/database/runtime layer.

## 17. Golden Example — Create Project

projects/page.tsx → ProjectForm → createProject() → apiRequest('/projects', POST) → /backend-api/projects → ProjectsController.create() → JwtAuthGuard → TenantContextGuard → PermissionGuard → RequirePermission(PROJECTS, CREATE) → ProjectsService.create() → Project → PostgreSQL

## 18. Source of Truth

Untuk implementasi aktual gunakan urutan: source controller → source service → DTO/type → Prisma Contract → frontend lib → frontend page/component → dokumentasi.

Dokumentasi membantu navigasi, tetapi source code menjadi source of truth ketika terjadi perbedaan.

## 19. Next Step

Langkah berikutnya yang direkomendasikan adalah 16-database-backend-map.md dengan pola Database Table → Prisma Contract Model → Backend Service → Controller → Frontend lib → Frontend Page.