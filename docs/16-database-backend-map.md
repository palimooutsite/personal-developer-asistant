# 16 — Database Backend Map

## 1. Tujuan

Dokumen ini memetakan alur dari database ke backend hingga frontend berdasarkan Prisma Contract dan source yang diperiksa pada branch `dev/project-members-api`.

Polanya:

Database Table → Prisma Contract Model → Backend Service → Controller / Endpoint → Frontend lib → Frontend Page

## 2. Identity & Workspace

### User

Prisma: `User`
Backend: AuthService, UsersService, TenantService, ProjectsService, TasksService, KnowledgeService, SnippetsService, DocumentsService, AuditService
Frontend: auth/account/workspace/project/task/knowledge/snippet/document/admin flows

Relasi utama: User → Tenant, TenantMember, TenantInvitation, Project, ProjectMember, Task, KnowledgeArticle, CodeSnippet, Document.

### Tenant
Prisma: `Tenant`
Backend: TenantService
Endpoint: `/tenants*`
Frontend: workspace selection/settings and TenantProvider.

Relasi: Tenant → members, roles, invitations, projects, tasks, knowledgeArticles, tags, snippets, documents, subscriptions, invoices, discountUsages, payments.

### TenantMember
Prisma: `TenantMember`
Backend: TenantService
Endpoint: `/tenants/:id/members*`
Frontend: workspace member management.

Authorization depends on workspace membership and custom role permission.

### TenantCustomRole / TenantRolePermission
Backend: TenantRoleService
Endpoint: `/tenants/:tenantId/roles*`
Frontend: workspace role/permission settings.

## 3. Project & Task

### Project
Prisma: `Project`
Backend: ProjectsService
Controller: ProjectsController
Endpoint: `/projects*`
Frontend: `lib/projects.ts` → Projects pages/components.

Tenant anchor: `Project.tenantId`. Owner anchor: `Project.createdBy`.

### ProjectMember
Prisma: `ProjectMember`
Backend: ProjectsService
Endpoint: `/projects/:id/members*`
Frontend: project member modal/components.

Unique key: `(projectId, userId)`.

### Task
Prisma: `Task`
Backend: TasksService
Controller: TasksController
Endpoint: `/projects/:projectId/tasks*`
Frontend: `lib/tasks.ts` → Tasks/Kanban components.

Tenant anchor: `Task.tenantId`; project anchor: `Task.projectId`.

### TaskAssignee
Prisma: `TaskAssignee`
Backend: TasksService
Endpoint: `/projects/:projectId/tasks/:taskId/assignees*`
Frontend: task assignee UI.

Relates task to a ProjectMember using `(projectId,userId)`.

## 4. Knowledge & Snippets

### KnowledgeArticle
Prisma: `KnowledgeArticle`
Backend: KnowledgeService
Controller: KnowledgeController
Endpoint: `/knowledge*`
Frontend: `lib/knowledge.ts` → Knowledge page/components.

Tenant isolation uses `tenantId`; slug is unique per tenant.

### Tag
Prisma: `Tag`
Backend: TagsService
Endpoint: `/tags*`
Frontend: knowledge/snippet tag selectors.

Tag name is unique per tenant.

### KnowledgeArticleTag
Backend: ArticleTagsService
Endpoint: `/knowledge/:articleId/tags*`
Frontend: knowledge tag UI.

### CodeSnippet
Prisma: `CodeSnippet`
Backend: SnippetsService
Controller: SnippetsController
Endpoint: `/snippets*`
Frontend: `lib/snippets.ts` → Snippets page/components.

### SnippetTag
Backend: SnippetTagsService
Endpoint: `/snippets/:snippetId/tags*`
Frontend: snippet tag UI.

Security note: current tag controllers use JWT + TenantContextGuard but do not use PermissionGuard.

## 5. Documents

### Document
Prisma: `Document`
Backend: DocumentsService + DocumentsController
Endpoints: `/documents`, `/documents/upload`, `/documents/:id`, `/documents/:id/file`
Frontend: `lib/documents.ts` → Documents page/components.

Tenant anchor: `tenantId`; creator anchor: `createdBy`.

Database stores metadata and `filePath`; physical file is stored under controller storage path `storage/documents/`.

## 6. Billing Catalog

### SubscriptionPackage
Backend: BillingCatalogService
Endpoints: `/billing/catalog/packages*`
Frontend: `lib/billing.ts` → billing page.

Relations: prices, features, discounts, subscriptions.

### SubscriptionFeature
Backend: BillingFeatureService
Used by package feature configuration and usage response.

### SubscriptionPackageFeature
Bridge package ↔ feature; contains `enabled` and `limitValue`.

### SubscriptionPackagePrice
Backend: BillingCatalogService / checkout services
Contains billing period, version, amountMinor, currency, active state.

## 7. Discounts

### Discount
Backend: DiscountService
Endpoints under billing discount/admin flows.

### DiscountPackage
Bridge discount ↔ package.

### DiscountUsage
Records discount consumption by tenant and optionally subscription/invoice.

### InvoiceDiscount
Stores invoice-specific discount snapshot and calculated amount.

## 8. Tenant Billing

### TenantSubscription
Backend: BillingSubscriptionService, CheckoutService, CheckoutSessionService
Endpoint: `/billing/tenants/:tenantId/subscription` and checkout flows.

Relations: Tenant, SubscriptionPackage, SubscriptionPackagePrice, SubscriptionInvoice, Payment, DiscountUsage.

### SubscriptionInvoice
Backend: BillingInvoiceService and checkout flow
Endpoint: tenant invoice and admin invoice flows.

Stores amount snapshots: original, discount, tax, final amount.

### Payment
Backend: BillingPaymentService / checkout
Endpoint: payment operations and sandbox success.

Relates Tenant + TenantSubscription + SubscriptionInvoice.

## 9. Pre-tenant Checkout

### BillingCheckoutSession
Prisma model contains userId, packageId, packagePriceId, workspaceName, discount snapshot, provider/session/payment identifiers, status, expiry and completion timestamps.

Backend: CheckoutSessionService
Frontend: checkout-session pages via `lib/billing.ts`.

Unlike most billing models, the current contract does not declare Prisma relation fields from BillingCheckoutSession to User/package/price.

## 10. Audit

### AuditLog
Backend: AuditService + AuditController
Frontend: Platform Admin audit pages.

Indexes: createdAt, userId+createdAt, tenantId+createdAt, entity+entityId, action+createdAt.

Audit persistence failure is handled by AuditService without propagating the failure to the business operation.

## 11. Tenant Isolation Map

Models with explicit tenantId: TenantMember, TenantInvitation, Project, Task, KnowledgeArticle, Tag, CodeSnippet, Document, TenantSubscription, SubscriptionInvoice, DiscountUsage, Payment.

ProjectMember and TaskAssignee do not have a direct tenantId; tenant scope is reached through Project / Task / ProjectMember relationships.

KnowledgeArticleTag and SnippetTag do not have direct tenantId; scope is reached through article/snippet and Tag relationships.

## 12. Billing Member Limit

Capacity source: TenantSubscription → SubscriptionPackageFeature → SubscriptionFeature(code=`WORKSPACE_MEMBER`).

Usage enforcement: TenantService.assertWorkspaceMemberCapacity() counts TenantMember plus pending non-expired TenantInvitation.

Important current gap: BillingFeatureService usage output does not currently calculate WORKSPACE_MEMBER usage, even though TenantService enforces the limit.

## 13. End-to-end Reverse Tracing

Example Project: `Project` → ProjectsService → ProjectsController → `/projects` → `lib/projects.ts` → Projects page.

Example Task: `Task` → TasksService → TasksController → `/projects/:projectId/tasks` → `lib/tasks.ts` → Tasks/Kanban.

Example Knowledge: `KnowledgeArticle` → KnowledgeService → KnowledgeController → `/knowledge` → `lib/knowledge.ts` → Knowledge page.

Example Document: `Document` → DocumentsService → DocumentsController → `/documents` → `lib/documents.ts` → Documents page.

Example Subscription: `TenantSubscription` → BillingSubscriptionService → billing controller → `/billing/tenants/:tenantId/subscription` → `lib/billing.ts` → Billing page.

## 14. Database-first Debugging

1. Identify table/model.
2. Locate model in `contract.prisma`.
3. Locate service reading/writing it.
4. Locate controller exposing the operation.
5. Locate frontend lib calling endpoint.
6. Locate page/component invoking lib function.
7. Verify tenantId/userId and permission boundaries.
8. Inspect database row and relation chain.

## 15. Source of Truth

When this document differs from implementation, use `contract.prisma`, controller, service, frontend lib, then page/component as the primary implementation sources. This document is a navigation map, not a replacement for source code.

## 16. Next Maintenance

Update this document whenever a new persistent model, backend service, endpoint, or frontend API client is introduced or removed.