# 12 — Troubleshooting & Bug Location Guide

## 1. Tujuan

Dokumen ini adalah **peta troubleshooting** untuk menentukan lokasi error/bug secepat mungkin.

Gunakan dokumen ini ketika:
- aplikasi tidak bisa start
- halaman blank/error
- button tidak bekerja
- API error
- login gagal
- workspace salah
- permission tidak sesuai
- data tidak muncul
- CRUD gagal
- upload gagal
- billing/checkout bermasalah
- database/Prisma error
- build TypeScript gagal

Prinsip utama:

```
Gejala
 ↓
Tentukan layer
 ↓
Verifikasi request
 ↓
Temukan boundary yang gagal
 ↓
Periksa file/fungsi
 ↓
Perbaiki
 ↓
Build + smoke test
```

---

# 2. Peta Layer Error

Arsitektur troubleshooting:

```
Browser
  │
  ├── UI / Component
  │
  ├── Page Handler
  │
  ├── lib/*.ts
  │
  ├── apiRequest()
  │
  ├── Next.js Rewrite
  │
  ▼
NestJS Controller
  │
  ├── JwtAuthGuard
  ├── TenantContextGuard
  ├── PlatformAdminGuard
  ├── Permission
  │
  ▼
NestJS Service
  │
  ├── Business Rule
  ├── Billing Rule
  ├── Tenant Isolation
  ├── Audit
  │
  ▼
Prisma Contract
  │
  ▼
PostgreSQL
```

**Aturan penting:** jangan langsung mengubah code pada layer yang terlihat oleh user. Temukan dulu layer pertama yang gagal.

---

# 3. Decision Tree Utama

## 3.1 Aplikasi tidak bisa dibuka

### Gejala

- `localhost:3001` tidak bisa dibuka
- `localhost:3002` tidak merespons
- `localhost:3003` tidak bisa dibuka

### Cek

```
Apakah process berjalan?
       |
       +-- TIDAK --> jalankan pnpm dev/start:dev
       |
       +-- YA
            |
            v
Apakah port benar?
            |
            +-- backend 3002
            +-- user frontend 3001
            +-- admin frontend 3003
```

### Lokasi yang diperiksa

| Aplikasi | Lokasi |
|---|---|
| Backend | `backend-personal-app/package.json`, `.env` |
| User Frontend | `frontend-personal-app/package.json`, `next.config.ts` |
| Admin Frontend | `frontend-personal-admin/package.json`, `next.config.ts` |

### Command

Backend:

```bash
cd backend-personal-app
pnpm start:dev
```

User:

```bash
cd frontend-personal-app
pnpm dev
```

Admin:

```bash
cd frontend-personal-admin
pnpm dev
```

---

# 4. Build Error

## 4.1 TypeScript error

Contoh:

```
Type error
Cannot find name ...
Property ... does not exist ...
Argument of type ... is not assignable ...
```

### Lokasi pertama

File + line number yang ditampilkan compiler.

### Urutan pemeriksaan

```
File error
 ↓
Import
 ↓
Type/interface
 ↓
Function parameter
 ↓
API response type
 ↓
Backend DTO/response
```

### Jangan langsung

```ts
const value: any = ...
```

Gunakan `any` hanya jika memang ada alasan dan boundary-nya jelas.

---

# 5. Prisma / Contract Error

## Gejala

Contoh:

```
Prisma error
Contract error
generated type error
Property ... does not exist
create/update API mismatch
```

### Lokasi

```
backend-personal-app/src/prisma/contract.prisma
backend-personal-app/src/prisma/
backend-personal-app/package.json
```

### Urutan

```
contract.prisma
 ↓
contract emit
 ↓
generated contract
 ↓
service query
 ↓
database schema
```

### Checklist

1. Apakah model ada di `contract.prisma`?
2. Apakah field benar-benar ada?
3. Apakah relation/enum berubah?
4. Apakah contract sudah di-emit?
5. Apakah database sudah di-update?
6. Apakah service menggunakan API Prisma Contract yang benar?

Repository menggunakan Prisma 8 Contract workflow. Jangan otomatis memakai pola Prisma Client lama.

---

# 6. Database Connection Error

## Gejala

- database connection refused
- authentication failed
- database does not exist
- timeout
- connection pool error

### Lokasi

```
backend-personal-app/.env
backend-personal-app/src/prisma/
PostgreSQL
```

### Urutan

```
DATABASE_URL
 ↓
host
 ↓
port
 ↓
database
 ↓
username
 ↓
password
 ↓
PostgreSQL running?
```

### Jangan mulai dari service

Jika koneksi database gagal, business service belum relevan.

---

# 7. Login Error

## 7.1 Login gagal

Flow:

```
LoginPage
 ↓
handleSubmit()
 ↓
auth.login()
 ↓
POST /auth/login
 ↓
AuthService
 ↓
JWT
 ↓
localStorage pda_access_token
```

### Periksa

1. Browser Network → `POST /backend-api/auth/login`
2. HTTP status
3. response body
4. backend `AuthController`
5. `AuthService`
6. database user/password
7. token storage

### File utama

```
frontend-personal-app/app/login/page.tsx
frontend-personal-app/lib/auth.ts
frontend-personal-app/lib/api.ts
backend-personal-app/src/auth/
```

---

# 8. Login Berhasil Tetapi Langsung Kembali ke Login

Kemungkinan utama:

```
Token tidak tersimpan
        OR
Token tidak dikirim
        OR
JWT invalid
        OR
/auth/me gagal
        OR
401 handling
```

### Periksa

Browser:

```
localStorage
└── pda_access_token
```

Kemudian:

```
GET /backend-api/auth/me
Authorization: Bearer <token>
```

### File

```
frontend-personal-app/lib/auth.ts
frontend-personal-app/lib/api.ts
frontend-personal-app/app/page.tsx
frontend-personal-app/components/providers/TenantProvider.tsx
```

---

# 9. Admin Login Gagal / User Biasa Bisa Masuk Admin

Flow:

```
AdminLoginPage
 ↓
auth.login()
 ↓
/auth/me
 ↓
isPlatformAdmin
 ↓
/admin
```

### Periksa

```
frontend-personal-admin/app/login/page.tsx
frontend-personal-admin/lib/auth.ts
frontend-personal-admin/app/page.tsx
frontend-personal-admin/app/admin/layout.tsx
backend-personal-app/src/auth/guard/platform-admin.guard.ts
backend-personal-app/src/users/user.service.ts
```

Security boundary tetap backend.

---

# 10. API Error 400

## Arti umum

Request sampai backend, tetapi input tidak valid.

### Flow troubleshooting

```
Browser Network
 ↓
Request payload
 ↓
HTTP 400
 ↓
Response message
 ↓
DTO/controller
```

### Periksa

- nama field
- tipe data
- required field
- enum
- format tanggal
- numeric value
- request body

### File

Frontend:

```
app/<module>/page.tsx
lib/<module>.ts
```

Backend:

```
dto/*.ts
*.controller.ts
```

---

# 11. API Error 401

## Arti

Authentication gagal atau token tidak tersedia/valid.

### Flow

```
Request
 ↓
Authorization header?
 ↓
JWT valid?
 ↓
JwtAuthGuard
 ↓
401
```

### Periksa

```
pda_access_token
Authorization: Bearer ...
```

File:

```
frontend-personal-app/lib/api.ts
frontend-personal-app/lib/auth.ts
backend-personal-app/src/auth/
```

---

# 12. API Error 403

## Arti

User terautentikasi tetapi tidak mempunyai hak akses.

Kemungkinan:

- tenant membership
- role
- permission
- Platform Admin
- resource membership

### Flow

```
JWT
 ↓
TenantContextGuard
 ↓
membership
 ↓
permission
 ↓
business authorization
 ↓
403
```

### Periksa

```
backend-personal-app/src/auth/guard/
backend-personal-app/src/tenants/
backend-personal-app/src/projects/
backend-personal-app/src/*/*.service.ts
```

Frontend permission hanya membantu UX.

---

# 13. API Error 404

Kemungkinan:

1. endpoint salah
2. ID tidak ditemukan
3. resource bukan milik tenant
4. route parameter salah
5. Next rewrite salah

### Urutan

```
Network URL
 ↓
next.config.ts
 ↓
Controller route
 ↓
parameter
 ↓
Service findOne
```

---

# 14. API Error 409

Biasanya berarti conflict/business constraint.

Contoh:

- slug sudah ada
- member sudah ada
- invitation duplicate
- role masih digunakan
- resource conflict

### Jangan hanya mengubah frontend

Cari business rule di service.

```
Page
 ↓
lib
 ↓
Controller
 ↓
Service
 ↓
Conflict rule
```

---

# 15. API Error 500

## Jangan langsung menyimpulkan database

HTTP 500 hanya menunjukkan server gagal memproses request.

### Urutan wajib

```
Browser Network
 ↓
response body
 ↓
NestJS terminal/log
 ↓
Controller
 ↓
Service
 ↓
Prisma
 ↓
Database
```

### Cari error pertama

Jika log:

```
Error A
Caused by Error B
Caused by Error C
```

Cari root cause terdalam, bukan hanya message paling atas.

---

# 16. Data Tidak Muncul di UI

Gunakan decision tree:

```
UI kosong
 |
 +--> Network request ada?
 |       |
 |       +-- TIDAK --> page/component logic
 |       |
 |       +-- YA
 |            |
 |            +--> HTTP 200?
 |                    |
 |                    +-- TIDAK --> API/backend
 |                    |
 |                    +-- YA
 |                         |
 |                         v
 |                    Response berisi data?
 |                         |
 |                         +-- TIDAK --> backend/query/filter
 |                         |
 |                         +-- YA --> setState/render problem
```

### File yang diperiksa

```
app/<module>/page.tsx
components/<module>/*
lib/<module>.ts
```

---

# 17. Data Salah / Data Workspace Salah

Ini biasanya **tenant context problem**.

### Periksa

Request harus mempunyai:

```
X-Tenant-Id: <activeTenantId>
```

### Flow

```
TenantSwitcher
 ↓
setActiveTenantId()
 ↓
localStorage
 ↓
apiRequest()
 ↓
X-Tenant-Id
 ↓
TenantContextGuard
 ↓
tenant-scoped service query
```

### File

```
frontend-personal-app/components/providers/TenantProvider.tsx
frontend-personal-app/components/providers/TenantSwitcher.tsx
frontend-personal-app/lib/tenant.ts
frontend-personal-app/lib/api.ts
backend-personal-app/src/tenants/
```

---

# 18. User Bisa Melihat Data Tenant Lain

Ini **security bug**, bukan sekadar UI bug.

Segera periksa:

```
Controller
 ↓
TenantContextGuard
 ↓
Service
 ↓
query WHERE tenantId
```

Resource tenant harus memiliki tenant boundary.

Contoh pola yang harus dicurigai:

```
findOne(resourceId)
```

tanpa memastikan:

```
tenantId = activeTenant
```

Prioritaskan pemeriksaan backend.

---

# 19. Permission UI Salah

## Button hilang

Periksa:

```
TenantProvider
 ↓
permissions
 ↓
can(module, action)
 ↓
component/page
```

## Button muncul tetapi API 403

Kemungkinan frontend dan backend permission tidak sinkron.

Backend tetap menjadi source of truth.

---

# 20. Project Error

## CRUD project gagal

Flow:

```
ProjectsPage
 ↓
handler
 ↓
lib/projects.ts
 ↓
ProjectsController
 ↓
ProjectsService
 ↓
Tenant membership
 ↓
Permission
 ↓
Billing limit
 ↓
Database
```

### Khusus create

Periksa juga:

```
PROJECT usage
 ↓
BillingFeatureService.assertWithinLimit()
```

### Khusus member

Periksa:

- tenant membership
- project membership
- OWNER/ADMIN
- target user
- duplicate member

---

# 21. Task Error

Flow:

```
TasksPage
 ↓
TaskForm / Kanban / AssigneeModal
 ↓
lib/tasks.ts
 ↓
TasksController
 ↓
TasksService
 ↓
Project membership
 ↓
Mutation role
 ↓
Billing TASK limit
 ↓
Database
```

### Jika Kanban tidak mengubah status

Periksa:

1. `handleKanbanStatusChange`
2. request PATCH/update
3. Network response
4. backend task update
5. state reload/render

---

# 22. Knowledge / Snippet Error

Flow:

```
Page
 ↓
Form/Card/Reader
 ↓
lib/knowledge.ts atau lib/snippets.ts
 ↓
Controller
 ↓
Service
 ↓
Tenant + creator
 ↓
Tag relation
 ↓
Database
```

### Jika tag salah

Periksa:

```
toggleTag()
 ↓
addArticleTag/removeArticleTag
atau
addSnippetTag/removeSnippetTag
 ↓
backend tag relation
```

---

# 23. Document Upload Error

Decision tree:

```
Upload gagal
 |
 +--> File dipilih?
 |
 +--> FormData dibuat?
 |
 +--> Network request multipart?
 |
 +--> Backend menerima file?
 |
 +--> Storage directory tersedia?
 |
 +--> Metadata database berhasil?
```

### File

```
frontend-personal-app/app/documents/page.tsx
frontend-personal-app/components/documents/DocumentForm.tsx
frontend-personal-app/lib/documents.ts
backend-personal-app/src/documents/
```

---

# 24. Billing Error

## 24.1 Package tidak muncul

```
Billing page
 ↓
getBillingPackages()
 ↓
GET billing catalog
 ↓
BillingCatalogController
 ↓
BillingCatalogService
 ↓
package/price active?
```

Periksa juga package price active dan response catalog.

## 24.2 Checkout gagal

Bedakan dua flow:

### Existing tenant

```
Plans
 ↓
Checkout
 ↓
createBillingCheckout()
 ↓
Subscription
 ↓
Invoice
 ↓
Payment
```

### Pre-tenant

```
Plans
 ↓
createBillingCheckoutSession()
 ↓
PENDING checkout session
 ↓
payment
 ↓
sandbox success
 ↓
Tenant
 ↓
Subscription
 ↓
Invoice
 ↓
Payment
```

### File frontend

```
app/billing/plans/
app/billing/checkout/
app/billing/checkout-session/
app/billing/payment/
lib/billing.ts
```

---

# 25. Billing Amount Salah

Periksa unit.

Backend menyimpan:

```
minor unit
```

Contoh:

```
Rp 99.000
↓
9.900.000
```

Jika UI menampilkan:

```
Rp 99.000.000
```

kemungkinan terjadi double conversion.

Periksa:

```
lib/billing.ts
page formatter money()
backend amountMinor calculation
```

---

# 26. Discount Tidak Terpakai

Periksa berurutan:

```
Discount active?
 ↓
tanggal valid?
 ↓
package assignment?
 ↓
minimum amount?
 ↓
usage limit?
 ↓
discount type?
 ↓
discount calculation?
 ↓
final amount?
```

File:

```
frontend-personal-admin/app/admin/billing/discounts/*
frontend-personal-admin/lib/billing.ts
backend-personal-app/src/billing/discount*
backend-personal-app/src/billing/checkout*
```

---

# 27. Subscription / Invoice / Payment Tidak Sinkron

Gunakan dependency:

```
Subscription
     |
     +--> Invoice
              |
              +--> Payment
```

Jika payment SUCCEEDED tetapi invoice tidak berubah:

1. cari payment service
2. cek sandbox/provider callback
3. cek invoice update
4. cek subscription activation
5. cek transaction/operation order

Jangan hanya memperbaiki halaman payment.

---

# 28. Audit Log Tidak Muncul

Flow:

```
Business mutation
 ↓
AuditService.create()
 ↓
AuditLog
 ↓
GET /audit-logs
 ↓
Admin audit page
```

Periksa:

```
action
entity
entityId
userId
tenantId
metadata
createdAt
```

Jika mutation berhasil tetapi audit tidak ada, periksa business service yang melakukan mutation terlebih dahulu.

---

# 29. Admin Billing Error

Flow:

```
Admin Page
 ↓
frontend-personal-admin/lib/billing.ts
 ↓
apiRequest()
 ↓
JwtAuthGuard
 ↓
PlatformAdminGuard
 ↓
Admin Billing Service
 ↓
Database
```

### Jika 403

Periksa `isPlatformAdmin`.

### Jika data kosong

Periksa endpoint admin dan query global, bukan tenant-scoped user endpoint.

---

# 30. Admin Audit Error

File:

```
frontend-personal-admin/app/admin/audit-logs/page.tsx
frontend-personal-admin/app/admin/audit-logs/[id]/page.tsx
frontend-personal-admin/lib/audit.ts
frontend-personal-admin/components/AdminShell.tsx
```

Backend:

```
audit.controller.ts
audit.service.ts
audit.module.ts
```

Jika audit API 401/403, mulai dari auth/admin guard.

---

# 31. Button Tidak Bekerja

Jangan langsung menyimpulkan component rusak.

Gunakan:

```
Button
 ↓
onClick/onSubmit
 ↓
page handler
 ↓
lib function
 ↓
apiRequest
 ↓
Network
 ↓
Backend
```

### Checklist

- handler terpanggil?
- console error?
- request muncul di Network?
- endpoint benar?
- payload benar?
- response status?
- state di-update?

Jika Network tidak mempunyai request → frontend problem.

Jika Network ada request tetapi error → lanjut backend.

---

# 32. Loading Tidak Berhenti

Kemungkinan:

- Promise tidak selesai
- error tidak masuk `finally`
- request hang
- state loading tidak di-reset
- component unmount/race

Cari pola:

```
setLoading(true)
 ↓
await ...
 ↓
setLoading(false)
```

Idealnya reset loading berada pada jalur yang selalu dieksekusi setelah request selesai.

---

# 33. Modal Tidak Muncul / Tidak Bisa Ditutup

Periksa:

```
parent state
 ↓
open/close handler
 ↓
Modal props
 ↓
conditional rendering
```

File generic:

```
components/ui/Modal.tsx
components/ui/ConfirmDialog.tsx
```

Jika modal spesifik module, periksa page yang mengontrol state modal.

---

# 34. Next.js Rewrite Error

Frontend menggunakan:

```
/backend-api/*
```

yang diteruskan ke backend:

```
http://localhost:3002/*
```

Periksa:

```
frontend-personal-app/next.config.ts
frontend-personal-admin/next.config.ts
```

Jika:

```
localhost:3001/backend-api/...
```

tidak sampai ke:

```
localhost:3002/...
```

maka jangan mulai dari NestJS service.

---

# 35. Error Berdasarkan HTTP Status

| Status | Fokus pertama |
|---:|---|
| 400 | DTO, payload, validation |
| 401 | JWT/token/auth |
| 403 | permission/role/tenant/admin |
| 404 | route/ID/resource/tenant |
| 409 | business conflict/unique |
| 413 | file/request size |
| 415 | content type/upload |
| 422 | validation/business input jika digunakan |
| 429 | rate limit jika digunakan |
| 500 | backend/service/Prisma/database |
| 502 | proxy/upstream |
| 503 | service unavailable/database/runtime |

---

# 36. Error Berdasarkan Gejala

| Gejala | Lokasi pertama |
|---|---|
| Page blank | browser console + page |
| Button tidak melakukan request | component/page handler |
| Request tidak muncul | frontend handler/lib |
| Request 400 | payload/DTO |
| Request 401 | auth/api |
| Request 403 | guard/permission |
| Request 404 | route/ID/tenant |
| Request 409 | business rule |
| Request 500 | backend log/service |
| Data kosong | query/filter/tenant/state |
| Data tenant salah | X-Tenant-Id/TenantContext |
| Login gagal | auth |
| Admin access salah | isPlatformAdmin/PlatformAdminGuard |
| Build gagal | compiler + file line |
| Prisma error | contract/generated/database |
| Upload gagal | FormData/controller/storage |
| Billing salah | billing service + amountMinor |
| Audit hilang | mutation service + AuditService |
| Port gagal | runtime/next config |
| DB gagal connect | .env/PostgreSQL |

---

# 37. Browser DevTools Checklist

Saat frontend bermasalah buka:

**F12 → Console**

Cari:
- JavaScript error
- React error
- hydration error
- undefined
- network-related error

Kemudian:

**F12 → Network**

Periksa:

```
Request URL
Request Method
Status Code
Request Headers
Authorization
X-Tenant-Id
Request Payload
Response
```

Untuk hampir semua API bug, Network tab adalah checkpoint pertama.

---

# 38. Backend Debug Checklist

Terminal backend:

```bash
cd backend-personal-app
pnpm start:dev
```

Saat request gagal, cari:

1. controller route
2. guard error
3. service error
4. Prisma error
5. database error

Jangan hanya membaca error frontend jika backend log menyediakan root cause.

---

# 39. Database Debug Checklist

Jika backend sudah benar tetapi data salah:

1. pastikan database yang digunakan benar
2. cek `DATABASE_URL`
3. cek tenantId
4. cek foreign key
5. cek unique constraint
6. cek record aktual
7. cek transaction
8. cek migration/schema

Prinsip:

```
Application result
 ≠
Database result
```

Keduanya harus diverifikasi.

---

# 40. Golden Troubleshooting Flow

Untuk bug umum gunakan urutan ini:

```
1. Reproduce
      ↓
2. Catat exact error
      ↓
3. Browser Console
      ↓
4. Network
      ↓
5. HTTP status
      ↓
6. Request payload/header
      ↓
7. Backend log
      ↓
8. Controller/Guard
      ↓
9. Service/business rule
      ↓
10. Prisma
      ↓
11. Database
      ↓
12. Fix root cause
      ↓
13. pnpm build
      ↓
14. Smoke test
```

---

# 41. Jangan Melakukan Ini

### Jangan langsung mengubah database

Jika API error, cari root cause dulu.

### Jangan menambahkan `any`

Jika TypeScript error, pahami type mismatch.

### Jangan mematikan guard

Jika 403, cari permission/role/tenant issue.

### Jangan menghapus tenant filter

Jika data tidak muncul, jangan mengorbankan tenant isolation.

### Jangan memperbaiki UI untuk backend error

Jika Network menunjukkan 500, periksa backend.

### Jangan menganggap dokumentasi selalu benar

Source code dan behavior aktual adalah source of truth.

---

# 42. Checklist Sebelum Menyatakan Bug Selesai

## Frontend

- [ ] Console bersih dari error terkait
- [ ] Network request benar
- [ ] payload benar
- [ ] Authorization benar
- [ ] X-Tenant-Id benar
- [ ] response diproses benar
- [ ] loading state kembali normal
- [ ] error state tampil benar
- [ ] state setelah mutation diperbarui

## Backend

- [ ] Controller benar
- [ ] Guard benar
- [ ] Permission benar
- [ ] Tenant isolation benar
- [ ] Business rule benar
- [ ] Prisma query benar
- [ ] Audit benar jika relevan

## Database

- [ ] schema sesuai contract
- [ ] migration/update sudah dilakukan
- [ ] foreign key benar
- [ ] data benar

## Validation

```bash
# Backend
pnpm build
pnpm lint

# User frontend
pnpm build
pnpm lint

# Admin frontend
pnpm build
pnpm lint
```

---

# 43. Template Investigasi Bug

Gunakan template ini setiap menemukan bug:

```
BUG ID:
Tanggal:

GEJALA:
-

EXPECTED:
-

ACTUAL:
-

URL:
-

USER:
-

TENANT:
-

ACTION:
-

HTTP STATUS:
-

REQUEST:
-

RESPONSE:
-

BROWSER CONSOLE:
-

BACKEND LOG:
-

DATABASE RESULT:
-

LAYER TERAKHIR YANG BERHASIL:
-

LAYER PERTAMA YANG GAGAL:
-

ROOT CAUSE:
-

FIX:
-

FILES CHANGED:
-

TEST:
-

BUILD:
-
```

Field **"Layer pertama yang gagal"** adalah field paling penting.

---

# 44. Contoh Menentukan Lokasi Bug

Misalnya user klik **Create Project**.

Network menunjukkan:

```
POST /backend-api/projects
403
```

Maka:

```
Button                 OK
 ↓
handler                OK
 ↓
lib/projects.ts        OK
 ↓
apiRequest             OK
 ↓
Next rewrite           OK
 ↓
backend route          OK
 ↓
authentication         OK
 ↓
authorization          GAGAL
```

Maka jangan mengubah `ProjectForm.tsx`.

Fokus ke:

```
ProjectsController
ProjectsService
Permission
Tenant membership
```

Contoh lain:

```
Button
 ↓
handler
 ↓
lib function
 ↓
Network
 ↓
TIDAK ADA REQUEST
```

Berarti fokus ke frontend:

```
Page handler
Component event
Form submit
local state
```

---

# 45. Kesimpulan

Gunakan prinsip:

> **Cari layer pertama yang gagal, bukan layer yang paling terlihat.**

Urutan mental model:

```
UI
 ↓
Handler
 ↓
Library
 ↓
HTTP
 ↓
Rewrite
 ↓
Controller
 ↓
Guard
 ↓
Service
 ↓
Prisma
 ↓
Database
```

Jika kita dapat menentukan **layer pertama yang gagal**, lokasi file dan fungsi yang harus diperiksa biasanya menjadi jauh lebih sempit.

Dokumen ini menjadi companion document untuk:

- `06-technical-service-logic.md` → memahami backend service
- `07-technical-frontend-flow.md` → memahami frontend flow
- `08-development-guide.md` → memahami workflow development
- `09-api-reference.md` → memahami API
- `10-deployment-guide.md` → troubleshooting deployment
- `11-backend-logic-map.md` → memahami peta logic backend
