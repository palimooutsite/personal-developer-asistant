# 05 — Code & File Reference

Dokumen ini adalah reference fungsi file source utama pada branch `dev/project-members-api`.

## Backend bootstrap

| File | Fungsi |
|---|---|
| src/main.ts | bootstrap NestJS |
| src/app.module.ts | root module |
| src/app.controller.ts | root controller |
| src/app.service.ts | root service |
| src/app.controller.spec.ts | root controller test |

## Auth

| File | Fungsi |
|---|---|
| auth.controller.ts | register, login, me, profile, password, avatar |
| auth.service.ts | authentication, JWT, password/profile |
| auth.module.ts | dependency/auth module |
| dto/login.dto.ts | login input |
| dto/register.dto.ts | register input |
| guard/jwt-auth.guard.ts | JWT guard |
| guard/platform-admin.guard.ts | Platform Admin guard |
| strategies/jwt.strategy.ts | JWT strategy |
| types/auth-request.ts | authenticated request type |

## Audit

| File | Fungsi |
|---|---|
| audit.controller.ts | query audit log untuk Platform Admin |
| audit.service.ts | create/query/detail audit |
| audit.module.ts | module registration |

Audit write bersifat non-blocking: kegagalan write dicatat server log dan tidak melempar error ke business operation.

## Billing

| File | Fungsi |
|---|---|
| billing.module.ts | dependency graph billing |
| catalog.controller.ts | catalog API |
| catalog.service.ts | package/feature/price logic |
| discount.controller.ts | discount API |
| discount.service.ts | discount logic |
| feature.controller.ts | tenant feature access |
| feature.service.ts | feature/limit evaluation |
| subscription.controller.ts | tenant subscription API |
| subscription.service.ts | subscription lifecycle |
| invoice.controller.ts | tenant invoice API |
| invoice.service.ts | invoice lifecycle/calculation |
| payment.controller.ts | tenant payment API |
| payment.service.ts | payment lifecycle/sandbox |
| checkout.controller.ts | tenant checkout API |
| checkout.service.ts | tenant checkout logic |
| checkout-session.controller.ts | pre-tenant checkout API |
| checkout-session.service.ts | checkout session/provisioning |
| admin-subscription.controller.ts | global subscription API |
| admin-subscription.service.ts | global subscription query |
| admin-invoice.controller.ts | global invoice API |
| admin-invoice.service.ts | global invoice query |
| admin-payment.controller.ts | global payment API |
| admin-payment.service.ts | global payment query |

### Billing DTO

- `create-package.dto.ts` — create package
- `update-package.dto.ts` — update package
- `create-feature.dto.ts` — create feature
- `update-feature.dto.ts` — update feature
- `create-price.dto.ts` — create price
- `update-price.dto.ts` — update price
- `set-package-feature.dto.ts` — package feature/limit
- `create-discount.dto.ts` — create discount
- `update-discount.dto.ts` — update discount
- `set-discount-package.dto.ts` — discount/package mapping
- `create-subscription.dto.ts` — subscription create
- `preview-invoice.dto.ts` — invoice preview
- `create-payment.dto.ts` — payment create
- `create-checkout.dto.ts` — tenant checkout
- `create-checkout-session.dto.ts` — pre-tenant checkout

## Dashboard

| File | Fungsi |
|---|---|
| dashboard.controller.ts | dashboard summary API |
| dashboard.service.ts | aggregate KPI workspace |
| dashboard.module.ts | module |

## Documents

| File | Fungsi |
|---|---|
| documents.controller.ts | upload, CRUD, file streaming |
| documents.service.ts | document storage/metadata logic |
| documents.module.ts | module |
| dto/create-document.dto.ts | create metadata |
| dto/update-document.dto.ts | update metadata |
| dto/upload-document.dto.ts | upload payload |

## Knowledge

| File | Fungsi |
|---|---|
| knowledge.controller.ts | article CRUD/query |
| knowledge.service.ts | article logic + tenant isolation |
| knowledge.module.ts | module |
| tags.controller.ts | tag CRUD |
| tags.service.ts | tag logic |
| article-tags.controller.ts | article/tag API |
| article-tags.service.ts | relationship logic |
| dto/create-knowledge-article.dto.ts | create article |
| dto/update-knowledge-article.dto.ts | update article |
| dto/query-knowledge.dto.ts | query |
| dto/create-tag.dto.ts | create tag |
| dto/update-tag.dto.ts | update tag |
| dto/add-article-tag.dto.ts | relationship input |

## Projects

| File | Fungsi |
|---|---|
| projects.controller.ts | project CRUD + project member |
| projects.service.ts | project/member business logic |
| projects.module.ts | module |
| dto/create-project.dto.ts | create |
| dto/update-project.dto.ts | update |
| dto/add-project-member.dto.ts | member/bulk input |
| dto/update-project-member.dto.ts | role update |

## Tasks

| File | Fungsi |
|---|---|
| tasks.controller.ts | task CRUD + assignee |
| tasks.service.ts | task business logic |
| tasks.module.ts | module |
| dto/create-task.dto.ts | create |
| dto/update-task.dto.ts | update |
| dto/add-task-assignee.dto.ts | assignment |

## Snippets

| File | Fungsi |
|---|---|
| snippets.controller.ts | snippet CRUD/query |
| snippets.service.ts | snippet logic + tenant isolation |
| snippets.module.ts | module |
| snippet-tags.controller.ts | snippet/tag API |
| snippet-tags.service.ts | relationship logic |
| dto/create-code-snippet.dto.ts | create |
| dto/update-code-snippet.dto.ts | update |
| dto/query-snippet.dto.ts | query |
| dto/add-snippet-tag.dto.ts | relationship input |

## Tenants / Workspace

| File | Fungsi |
|---|---|
| tenant.controller.ts | workspace/member/invitation API |
| tenant.service.ts | workspace/member/invitation rules |
| tenant.module.ts | module/dependencies |
| types/tenant-request.ts | tenant-aware request |
| guard/tenant-context.guard.ts | tenant context/membership |
| roles/permission.constants.ts | permission definitions |
| roles/permission.guard.ts | permission enforcement |
| roles/require-permission.decorator.ts | permission metadata |
| roles/tenant-role.controller.ts | role/permission API |
| roles/tenant-role.module.ts | role module |
| roles/tenant-role.service.ts | role logic |

Tenant DTO:

- `create-tenant.dto.ts`
- `update-tenant.dto.ts`
- `add-tenant-member.dto.ts`
- `update-tenant-member.dto.ts`
- `create-tenant-invitation.dto.ts`
- `accept-tenant-invitation.dto.ts`

## Users

| File | Fungsi |
|---|---|
| user.controller.ts | tenant-scoped user search |
| user.service.ts | user persistence/query |
| user.module.ts | module |

## Infrastructure

| File | Fungsi |
|---|---|
| prisma/contract.prisma | source database contract |
| prisma/contract.json | generated contract metadata |
| prisma/contract.d.ts | generated contract types |
| prisma/db.ts | database helper |
| prisma/prisma.module.ts | Prisma module |
| prisma/prisma.service.ts | Prisma service |
| email/email.module.ts | email module |
| email/email.service.ts | email service |
| health/health.module.ts | health module |
| health/health.controller.ts | health endpoint |

## User Frontend pages

- `app/page.tsx` — entry/root routing
- `app/layout.tsx` — root layout
- `app/landing/page.tsx` — landing
- `app/login/page.tsx` — login
- `app/register/page.tsx` — registration
- `app/workspace-selection/page.tsx` — workspace selector
- `app/dashboard/page.tsx` — dashboard
- `app/projects/page.tsx` — projects
- `app/tasks/page.tsx` — tasks
- `app/knowledge/page.tsx` — knowledge
- `app/snippets/page.tsx` — snippets
- `app/documents/page.tsx` — documents
- `app/tenants/page.tsx` — workspace
- `app/workspace-settings/page.tsx` — settings
- `app/account-settings/page.tsx` — account
- `app/invitations/accept/page.tsx` — invitation
- `app/billing/page.tsx` — billing overview
- `app/billing/plans/page.tsx` — plans
- `app/billing/checkout/page.tsx` — checkout
- `app/billing/checkout-session/page.tsx` — checkout session
- `app/billing/checkout-session/payment/page.tsx` — sandbox payment
- `app/billing/subscription/page.tsx` — subscription
- `app/billing/payment/[paymentId]/page.tsx` — payment detail

## User Frontend libraries

| File | Fungsi |
|---|---|
| lib/api.ts | HTTP/auth/tenant client |
| lib/auth.ts | auth/token |
| lib/account.ts | account |
| lib/tenant.ts | workspace |
| lib/users.ts | user search |
| lib/projects.ts | project API |
| lib/tasks.ts | task API |
| lib/knowledge.ts | knowledge API |
| lib/snippets.ts | snippet API |
| lib/documents.ts | document API |
| lib/billing.ts | billing API |

## Platform Admin Frontend

### Pages

- `app/page.tsx` — root routing
- `app/layout.tsx` — root layout
- `app/login/page.tsx` — admin login
- `app/admin/layout.tsx` — admin layout
- `app/admin/page.tsx` — dashboard
- `app/admin/billing/page.tsx` — billing control center
- `app/admin/billing/packages/page.tsx` — plans
- `app/admin/billing/packages/[id]/page.tsx` — plan detail
- `app/admin/billing/features/page.tsx` — features/limits
- `app/admin/billing/discounts/page.tsx` — discounts
- `app/admin/billing/discounts/[id]/page.tsx` — discount detail
- `app/admin/subscriptions/page.tsx` — subscriptions
- `app/admin/subscriptions/[id]/page.tsx` — subscription detail
- `app/admin/invoices/page.tsx` — invoices
- `app/admin/invoices/[id]/page.tsx` — invoice detail
- `app/admin/payments/page.tsx` — payments
- `app/admin/payments/[id]/page.tsx` — payment detail
- `app/admin/audit-logs/page.tsx` — audit logs
- `app/admin/audit-logs/[id]/page.tsx` — audit detail

### Shared admin code

| File | Fungsi |
|---|---|
| components/AdminShell.tsx | sidebar/navigation/layout |
| lib/api.ts | HTTP client |
| lib/auth.ts | admin auth |
| lib/billing.ts | billing API client |
| lib/audit.ts | audit API client |

## Program flow

### Backend

```
HTTP request
  ↓
Controller
  ↓
Guard
  ↓
DTO/input
  ↓
Service
  ↓
Prisma Contract ORM
  ↓
PostgreSQL
```

### Frontend

```
Page/component
  ↓
lib/*.ts
  ↓
/backend-api/*
  ↓
NestJS
  ↓
service
  ↓
database
```

Controller menangani HTTP boundary, service menangani business rule, guard authorization, DTO input contract, dan Prisma contract persistence boundary.
