# 07 — Frontend Technical Flow

Dokumen ini menjelaskan implementasi frontend berdasarkan source branch `dev/project-members-api`.

## 1. Frontend architecture

Ada dua aplikasi Next.js:

- `frontend-personal-app` — user application, port 3001.
- `frontend-personal-admin` — Platform Admin, port 3003.

Keduanya menggunakan backend NestJS yang sama pada port 3002 melalui rewrite `/backend-api/*`.

Flow umum:

```
Page / Component
  ↓
lib/*.ts
  ↓
/backend-api/*
  ↓
Next.js rewrite
  ↓
NestJS API
```

## 2. User API client

File: `frontend-personal-app/lib/api.ts`

### apiRequest()

Fungsi ini menjadi HTTP abstraction utama.

Tugas:
- mengambil `pda_access_token` dari localStorage
- mengambil `pda_active_tenant_id`
- menambahkan `Authorization: Bearer ...`
- menambahkan `X-Tenant-Id`
- menetapkan Content-Type JSON jika body bukan FormData
- parsing JSON response
- mengubah API error menjadi `ApiError`
- jika 401, token dan active tenant dihapus lalu redirect ke `/login`

Karena itu page tidak perlu mengimplementasikan header authentication secara manual.

## 3. Authentication pages

### /register

File: `app/register/page.tsx`

State:
- username
- email
- name
- password
- passwordConfirmation
- loading
- error

Flow:

```
form submit
 ↓
password confirmation check
 ↓
lib/auth.register()
 ↓
POST /auth/register
 ↓
redirect /login
```

Query invitation/plan/billingPeriod dipertahankan ketika redirect ke login.

### /login

File: `app/login/page.tsx`

Flow:

```
submit email/password
 ↓
lib/auth.login()
 ↓
store pda_access_token
 ↓
clear active tenant
 ↓
cek plan / invitation
```

Jika ada plan → checkout-session.

Jika ada invitation → invitation acceptance.

Jika tidak:
- punya workspace → workspace-selection
- tidak punya workspace → billing/plans

API error ditampilkan pada form.

## 4. Workspace selection

File: `app/workspace-selection/page.tsx`

Saat mount:
- GET /tenants
- tampilkan loading skeleton
- tampilkan error jika gagal

Ketika workspace dipilih:

```
setActiveTenantId()
 ↓
localStorage pda_active_tenant_id
 ↓
/dashboard
```

Jika tidak ada workspace, user diarahkan ke `/billing/plans` untuk membuat workspace melalui billing flow.

## 5. Tenant library

File: `lib/tenant.ts`

Menyediakan abstraction untuk:
- list/create/update workspace
- list/add/update/remove member
- invitation create/accept
- permission lookup
- custom role CRUD
- active tenant state

Active tenant tidak disimpan di React global state pada library ini; sumber persistensinya adalah localStorage.

## 6. Dashboard

File: `app/dashboard/page.tsx`

Dashboard mengambil:
- current user
- dashboard summary
- tenant permission melalui TenantProvider

Summary berisi:
- project totals/status
- task totals/status/priority
- knowledge count
- snippet totals/language
- tag count

UI kemudian menampilkan statistic cards dan module shortcuts.

Permission dipakai untuk menentukan kemampuan user terhadap module tertentu.

## 7. TenantProvider / permission-driven UI

Tenant context menyediakan state tenant aktif dan permission.

Konsep:

```
active tenant
 ↓
GET permissions
 ↓
TenantProvider
 ↓
can(module, action)
 ↓
UI visibility / interaction
```

Frontend permission hanya untuk UX. Authorization final tetap dilakukan backend.

## 8. Billing library

File: `frontend-personal-app/lib/billing.ts`

Library membagi billing menjadi:

### Catalog

- getBillingPackages()
- getBillingPackage()
- getBillingPackageFeatures()

Dipakai untuk menampilkan plan dan feature.

### Subscription

- getCurrentSubscription()
- getBillingUsage()

Dipakai pada subscription/billing pages.

### Tenant checkout

- createBillingCheckout()
- sandboxSucceedPayment()

Ini merupakan flow checkout terhadap tenant yang sudah ada.

### Pre-tenant checkout

- createBillingCheckoutSession()
- sandboxSucceedCheckoutSession()
- sandboxFailCheckoutSession()

Ini digunakan ketika user belum mempunyai workspace dan checkout harus sekaligus membuat workspace.

## 9. Billing pages

### /billing/plans

Tujuan:
- mengambil package catalog
- menampilkan package dan harga
- user memilih package/billing period
- meneruskan pilihan ke checkout.

### /billing/checkout

Digunakan untuk checkout workspace yang sudah ada.

Flow:

```
package
 ↓
package price
 ↓
optional discount
 ↓
POST /billing/tenants/:tenantId/checkout
 ↓
subscription + invoice + payment response
```

### /billing/checkout-session

Digunakan untuk pre-tenant checkout.

Input utama:
- package
- billing period
- workspaceName
- optional discount

Flow:

```
POST /billing/checkout-sessions
 ↓
PENDING session
 ↓
payment/sandbox
 ↓
sandbox succeed
 ↓
Tenant + Subscription + Invoice + Payment
```

### /billing/checkout-session/payment

Menjadi UI simulasi pembayaran sandbox untuk checkout session.

### /billing/subscription

Menampilkan subscription aktif/terakhir dan informasi package/price/period.

## 10. User workspace pages

Halaman berikut mengikuti pola yang sama:

```
Page
 ↓
state/filter/form
 ↓
lib/*.ts
 ↓
apiRequest()
 ↓
NestJS
 ↓
reload state
```

### Projects

CRUD project dan project members.

### Tasks

CRUD task, status/priority, dan assignee.

### Knowledge

CRUD knowledge article serta tag relationship.

### Snippets

CRUD code snippet serta tag relationship.

### Documents

Upload, metadata, file view/download, update dan delete.

### Workspace settings

Mengelola workspace, member, invitation dan custom role/permission.

### Account settings

Mengelola profile, password dan avatar.

## 11. Invitation flow

Invitation dapat membawa token dari URL.

Login/register mempertahankan token invitation.

Setelah authentication selesai:

```
invitation token
 ↓
/invitations/accept
 ↓
POST /tenants/invitations/accept
 ↓
TenantMember dibuat
 ↓
redirect ke workspace
```

## 12. Admin API client

File: `frontend-personal-admin/lib/api.ts`

Mirip user API client tetapi lebih sederhana:
- Bearer token
- JSON request
- response parsing
- ApiError

Admin client tidak menambahkan X-Tenant-Id karena halaman admin bekerja pada global platform scope.

## 13. Admin authentication

File: `frontend-personal-admin/lib/auth.ts`

Login:
- POST /auth/login
- simpan access token

Current user:
- GET /auth/me
- membaca `isPlatformAdmin`

Admin routing menggunakan flag tersebut sebagai gate UI, sementara backend tetap menggunakan PlatformAdminGuard sebagai authorization source of truth.

Logout menghapus `pda_access_token`.

## 14. AdminShell

File: `frontend-personal-admin/components/AdminShell.tsx`

Tanggung jawab:
- sidebar
- active navigation
- Billing submenu
- top header
- logout
- link ke User Application

Navigation utama:
- Dashboard
- Users
- Workspaces
- Billing
- Subscriptions
- Invoices
- Payments
- Audit Logs

Billing submenu:
- Overview
- Plans & Prices
- Features & Limits
- Discounts

## 15. Admin Billing

### /admin/billing

Entry point Billing Control Center.

Menampilkan:
- active plans
- total plans
- active prices
- shortcut ke catalog management.

### /admin/billing/packages

Mengambil package catalog dan menampilkan:
- status
- monthly/yearly price
- capabilities
- plan activation
- navigation ke detail.

### /admin/billing/packages/[id]

Mengelola:
- package metadata
- price version
- amount
- active/inactive price
- feature enabled/disabled
- LIMIT value.

Flow feature:

```
Feature master
 ↓
Package detail
 ↓
enable feature
 ↓
set limit jika LIMIT
 ↓
POST package-feature
```

### /admin/billing/features

Mengambil seluruh feature.

Membedakan:
- BOOLEAN
- LIMIT

Mendukung create feature dan activation/deactivation.

### /admin/billing/discounts

State form menyimpan code, name, type, value, minimum, max discount, duration, cycles, usage limit dan validity.

Frontend melakukan transformasi:
- Rupiah → amountMinor
- percentage → percentage
- datetime-local → ISO string

Setelah create, list direfresh.

### /admin/billing/discounts/[id]

Mengambil secara paralel:
- discount detail
- package catalog
- assigned packages

Assignment di-toggle melalui POST/DELETE package mapping.

## 16. Admin subscription/invoice/payment monitoring

Ketiga halaman menggunakan typed client pada `lib/billing.ts`.

### Subscription

- list global subscription
- search/filter
- KPI status
- detail read-only

### Invoice

- list global invoice
- status/payment status
- amount breakdown
- detail read-only

### Payment

- list global payment
- provider/status
- amount
- invoice/workspace relation
- detail read-only

Tidak ada mutation payment/subscription/invoice pada admin UI saat ini.

## 17. Admin Audit Logs

File: `lib/audit.ts`

`listAuditLogs()` membangun query string dari:
- q
- action
- entity
- tenantId
- userId

Page Audit Logs menampilkan timeline dan metadata actor/workspace.

Detail page menampilkan:
- action
- entity
- entityId
- actor
- workspace
- metadata
- IP
- user-agent
- timestamp

## 18. Loading/error pattern

Frontend menggunakan state lokal seperti:
- loading
- saving
- error
- message

Pola umum:

```
setLoading(true)
try {
  API call
  update state
} catch {
  setError(...)
} finally {
  setLoading(false)
}
```

ApiError digunakan untuk mengambil message dari backend.

## 19. Security boundary

Frontend:
- menyimpan token pada localStorage
- menyimpan active tenant pada localStorage
- menampilkan UI berdasarkan permission

Backend:
- memvalidasi JWT
- memvalidasi tenant membership
- memvalidasi permission
- memvalidasi Platform Admin
- menjalankan business rules

Karena itu perubahan UI tidak boleh dianggap sebagai cara bypass authorization.

## 20. Data lifecycle

User application:

```
Input
 ↓
React state
 ↓
lib function
 ↓
apiRequest
 ↓
NestJS
 ↓
response
 ↓
setState
 ↓
render
```

Admin application menggunakan lifecycle yang sama, tetapi resource billing/audit yang dipanggil mempunyai platform/global scope.

## 21. Source-of-truth rule

Untuk frontend:
- page/component = presentation + interaction
- lib/*.ts = API client/type mapping
- backend = authorization + business rules
- Prisma/database = persistence

Dokumentasi ini menggambarkan source saat ini dan harus diperbarui apabila route, API client, state flow atau authorization boundary berubah.
