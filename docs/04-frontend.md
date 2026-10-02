# 04 — Frontend

Repository memiliki dua aplikasi frontend Next.js.

- `frontend-personal-app`: aplikasi user.
- `frontend-personal-admin`: aplikasi Platform Admin.

## User Application

Development port: `3001`.

### Pages

| Route | Fungsi |
|---|---|
| / | entry/root routing |
| /landing | landing page |
| /login | login |
| /register | registrasi |
| /workspace-selection | memilih workspace aktif |
| /dashboard | dashboard workspace |
| /projects | project management |
| /tasks | task management |
| /knowledge | knowledge base |
| /snippets | code snippets |
| /documents | document management |
| /tenants | workspace management |
| /workspace-settings | workspace settings |
| /account-settings | account/profile |
| /invitations/accept | menerima invitation |

### Billing pages

| Route | Fungsi |
|---|---|
| /billing | billing overview |
| /billing/plans | melihat package |
| /billing/checkout | checkout |
| /billing/checkout-session | checkout session |
| /billing/checkout-session/payment | sandbox payment |
| /billing/subscription | subscription |
| /billing/payment/[paymentId] | payment detail |

Route `/admin/*` yang masih ada di user app merupakan area legacy; arsitektur admin utama sekarang menggunakan `frontend-personal-admin`.

## User frontend libraries

| File | Fungsi |
|---|---|
| lib/api.ts | HTTP client, Bearer token, X-Tenant-Id, 401 handling |
| lib/auth.ts | login, current user, logout |
| lib/account.ts | account/profile API |
| lib/tenant.ts | workspace API |
| lib/users.ts | user search |
| lib/projects.ts | project API |
| lib/tasks.ts | task API |
| lib/knowledge.ts | knowledge API |
| lib/snippets.ts | snippet API |
| lib/documents.ts | document API |
| lib/billing.ts | billing API |

### Login flow

```
/login
  ↓
POST /auth/login
  ↓
pda_access_token
  ↓
GET /auth/me
  ↓
workspace selection / dashboard
```

### Tenant flow

```
/workspace-selection
  ↓
GET /tenants
  ↓
select tenant
  ↓
pda_active_tenant_id
  ↓
lib/api.ts
  ↓
X-Tenant-Id
```

## Platform Admin Application

Development port: `3003`.

### Routes

| Route | Fungsi |
|---|---|
| / | root admin routing |
| /login | Platform Admin login |
| /admin | dashboard |
| /admin/billing | Billing Control Center |
| /admin/billing/packages | Plans & Prices |
| /admin/billing/packages/[id] | package detail |
| /admin/billing/features | Features & Limits |
| /admin/billing/discounts | Discount management |
| /admin/billing/discounts/[id] | discount detail |
| /admin/subscriptions | global subscription monitoring |
| /admin/subscriptions/[id] | subscription detail |
| /admin/invoices | global invoice monitoring |
| /admin/invoices/[id] | invoice detail |
| /admin/payments | global payment monitoring |
| /admin/payments/[id] | payment detail |
| /admin/audit-logs | audit timeline/search |
| /admin/audit-logs/[id] | audit detail |

### AdminShell

`components/AdminShell.tsx` menyediakan:

- sidebar
- navigation
- billing submenu
- current route state
- logout
- link ke User Application

### Admin libraries

| File | Fungsi |
|---|---|
| lib/api.ts | HTTP client admin |
| lib/auth.ts | authentication admin |
| lib/billing.ts | typed billing admin API |
| lib/audit.ts | typed audit API |

### Admin page behavior

**Dashboard** — KPI ringkas dan catalog package.

**Billing** — entry point untuk package, feature/limit, dan discount.

**Plans & Prices** — mengelola package, status, harga monthly/yearly, capability.

**Package Detail** — mengelola price version, enable/disable feature, dan limit.

**Features & Limits** — membuat dan mengelola feature BOOLEAN/LIMIT.

**Discounts** — membuat promo, validity, usage, minimum transaksi, maximum discount, duration.

**Discount Detail** — konfigurasi promo dan assignment package.

**Subscriptions** — monitoring global subscription. Read-only.

**Invoices** — monitoring global invoice dan payment status. Read-only.

**Payments** — monitoring global payment. Read-only.

**Audit Logs** — timeline aktivitas platform, actor, workspace, action, metadata, IP, user-agent.

## Frontend security boundary

Frontend bukan sumber otorisasi utama.

```
Page
 ↓
lib/*.ts
 ↓
NestJS API
 ↓
JwtAuthGuard
 ↓
TenantContextGuard / PlatformAdminGuard
 ↓
PermissionGuard
 ↓
Service
```

Backend tetap menjadi sumber kebenaran authorization dan business rules.
