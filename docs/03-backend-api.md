# 03 — Backend API

Development base: http://localhost:3002
Frontend proxy: /backend-api/*

## Authentication

JWT header:

    Authorization: Bearer <JWT>

Tenant endpoint biasanya juga membutuhkan:

    X-Tenant-Id: <TENANT_ID>

Guard:
- JwtAuthGuard = authentication
- TenantContextGuard = tenant membership/context
- PermissionGuard = module/action permission
- PlatformAdminGuard = isPlatformAdmin authorization

## Auth

| Method | Endpoint | Guard | Fungsi |
|---|---|---|---|
| POST | /auth/register | public | register user |
| POST | /auth/login | public | login dan JWT |
| GET | /auth/me | JWT | current user |
| POST | /auth/profile | JWT | update profile |
| POST | /auth/password | JWT | change password |
| POST | /auth/avatar | JWT | upload avatar |
| POST | /auth/avatar/remove | JWT | remove avatar |

Avatar menerima JPG, PNG, WebP dan maksimum 2 MB.

## Users

| Method | Endpoint | Guard | Fungsi |
|---|---|---|---|
| GET | /users/search | JWT + Tenant | mencari user untuk workspace |

Query: search, page, limit, excludeUserIds.

## Tenants

| Method | Endpoint | Guard | Fungsi |
|---|---|---|---|
| GET | /tenants | JWT | list workspace user |
| GET | /tenants/:id | JWT + Tenant | detail workspace |
| GET | /tenants/:id/permissions | JWT + Tenant | permission user |
| POST | /tenants | JWT | create workspace |
| PATCH | /tenants/:id | JWT | update workspace |
| GET | /tenants/:id/members | JWT | list member |
| POST | /tenants/:id/members | JWT | add member |
| PATCH | /tenants/:id/members/:userId | JWT | update role |
| DELETE | /tenants/:id/members/:userId | JWT | remove member |
| POST | /tenants/:id/invitations | JWT | create invitation |
| POST | /tenants/invitations/accept | JWT | accept invitation |

## Tenant roles

Base: `/tenants/:tenantId/roles`

| Method | Endpoint | Permission | Fungsi |
|---|---|---|---|
| GET | /tenants/:tenantId/roles | WORKSPACE_SETTINGS:READ | list custom roles |
| POST | /tenants/:tenantId/roles | WORKSPACE_SETTINGS:CREATE | create role |
| POST | /tenants/:tenantId/roles/migrate-legacy-members | WORKSPACE_SETTINGS:UPDATE | migrate legacy members |
| GET | /tenants/:tenantId/roles/:roleId | WORKSPACE_SETTINGS:READ | role detail |
| PATCH | /tenants/:tenantId/roles/:roleId | WORKSPACE_SETTINGS:UPDATE | update role |
| DELETE | /tenants/:tenantId/roles/:roleId | WORKSPACE_SETTINGS:DELETE | delete role |

## Dashboard

GET /dashboard/summary — JWT + Tenant + DASHBOARD:READ.

## Projects

| Method | Endpoint | Permission |
|---|---|---|
| GET | /projects | PROJECTS:READ |
| GET | /projects/:id | PROJECTS:READ |
| POST | /projects | PROJECTS:CREATE |
| PATCH | /projects/:id | PROJECTS:UPDATE |
| DELETE | /projects/:id | PROJECTS:DELETE |
| GET | /projects/:id/members | PROJECT_MEMBERS:READ |
| POST | /projects/:id/members | PROJECT_MEMBERS:CREATE |
| POST | /projects/:id/members/bulk | PROJECT_MEMBERS:CREATE |
| PATCH | /projects/:id/members/:userId | PROJECT_MEMBERS:UPDATE |
| DELETE | /projects/:id/members/:userId | PROJECT_MEMBERS:DELETE |

## Tasks

Base: /projects/:projectId/tasks

| Method | Endpoint | Permission |
|---|---|---|
| POST | /projects/:projectId/tasks | TASKS:CREATE |
| GET | /projects/:projectId/tasks | TASKS:READ |
| GET | /projects/:projectId/tasks/:taskId | TASKS:READ |
| PATCH | /projects/:projectId/tasks/:taskId | TASKS:UPDATE |
| DELETE | /projects/:projectId/tasks/:taskId | TASKS:DELETE |
| POST | /projects/:projectId/tasks/:taskId/assignees | TASKS:UPDATE |
| GET | /projects/:projectId/tasks/:taskId/assignees | TASKS:READ |
| DELETE | /projects/:projectId/tasks/:taskId/assignees/:assigneeUserId | TASKS:UPDATE |

Task list mendukung query page, limit dan all.

## Knowledge

| Method | Endpoint | Permission |
|---|---|---|
| POST | /knowledge | KNOWLEDGE:CREATE |
| GET | /knowledge | KNOWLEDGE:READ |
| GET | /knowledge/:id | KNOWLEDGE:READ |
| PATCH | /knowledge/:id | KNOWLEDGE:UPDATE |
| DELETE | /knowledge/:id | KNOWLEDGE:DELETE |

Article tags:
- GET /knowledge/:articleId/tags
- POST /knowledge/:articleId/tags
- DELETE /knowledge/:articleId/tags/:tagId

Generic tags:
- POST /tags
- GET /tags
- GET /tags/:id
- PATCH /tags/:id
- DELETE /tags/:id

## Snippets

| Method | Endpoint | Permission |
|---|---|---|
| POST | /snippets | CODE_SNIPPETS:CREATE |
| GET | /snippets | CODE_SNIPPETS:READ |
| GET | /snippets/:id | CODE_SNIPPETS:READ |
| PATCH | /snippets/:id | CODE_SNIPPETS:UPDATE |
| DELETE | /snippets/:id | CODE_SNIPPETS:DELETE |

Snippet tags:
- GET /snippets/:snippetId/tags
- POST /snippets/:snippetId/tags
- DELETE /snippets/:snippetId/tags/:tagId

## Documents

| Method | Endpoint | Permission |
|---|---|---|
| POST | /documents/upload | DOCUMENTS:CREATE |
| POST | /documents | DOCUMENTS:CREATE |
| GET | /documents | DOCUMENTS:READ |
| GET | /documents/:id | DOCUMENTS:READ |
| GET | /documents/:id/file | DOCUMENTS:READ |
| PATCH | /documents/:id | DOCUMENTS:UPDATE |
| DELETE | /documents/:id | DOCUMENTS:DELETE |

Upload: PDF, DOCX, TXT, Markdown. Maximum 10 MB.

## Billing catalog

Public:
- GET /billing/catalog/packages
- GET /billing/catalog/packages/:id
- GET /billing/catalog/packages/:id/features
- GET /billing/catalog/features
- GET /billing/catalog/packages/:packageId/prices

Platform Admin:
- POST /billing/catalog/seed-defaults
- POST /billing/catalog/packages
- PATCH /billing/catalog/packages/:id
- POST /billing/catalog/features
- PATCH /billing/catalog/features/:id
- POST /billing/catalog/packages/:packageId/prices
- PATCH /billing/catalog/prices/:id
- POST /billing/catalog/packages/:packageId/features/:featureId
- DELETE /billing/catalog/packages/:packageId/features/:featureId

## Discounts — Platform Admin

- GET /billing/discounts
- GET /billing/discounts/:id
- POST /billing/discounts
- PATCH /billing/discounts/:id
- GET /billing/discounts/:id/packages
- POST /billing/discounts/:id/packages/:packageId
- DELETE /billing/discounts/:id/packages/:packageId

## Tenant billing

Feature:
- GET /billing/tenants/:tenantId/features
- GET /billing/tenants/:tenantId/features/:code

Subscription:
- GET /billing/tenants/:tenantId/subscription
- POST /billing/tenants/:tenantId/subscription
- PATCH /billing/tenants/:tenantId/subscription/cancel

Invoice:
- GET /billing/tenants/:tenantId/invoices
- GET /billing/tenants/:tenantId/invoices/:invoiceId
- POST /billing/tenants/:tenantId/invoices/preview
- POST /billing/tenants/:tenantId/invoices

Payment:
- GET /billing/tenants/:tenantId/payments
- GET /billing/tenants/:tenantId/payments/:paymentId
- POST /billing/tenants/:tenantId/invoices/:invoiceId/payment
- POST /billing/tenants/:tenantId/payments/:paymentId/sandbox/succeed
- POST /billing/tenants/:tenantId/payments/:paymentId/sandbox/fail

Checkout:
- POST /billing/tenants/:tenantId/checkout

Pre-tenant checkout session:
- POST /billing/checkout-sessions
- POST /billing/checkout-sessions/:sessionId/sandbox/succeed
- POST /billing/checkout-sessions/:sessionId/sandbox/fail

## Platform Admin monitoring

- GET /billing/admin/subscriptions
- GET /billing/admin/subscriptions/:id
- GET /billing/admin/invoices
- GET /billing/admin/invoices/:id
- GET /billing/admin/payments
- GET /billing/admin/payments/:id

Semua endpoint tersebut read-only dan membutuhkan JWT + PlatformAdminGuard.

## Audit

- GET /audit-logs?q=&action=&entity=&tenantId=&userId=
- GET /audit-logs/:id

Audit endpoint membutuhkan JWT + PlatformAdminGuard.

## Typical request

    GET /backend-api/projects
    Authorization: Bearer <JWT>
    X-Tenant-Id: <TENANT_ID>

Backend authorization tetap menjadi source of truth; frontend tidak boleh dianggap sebagai security boundary.