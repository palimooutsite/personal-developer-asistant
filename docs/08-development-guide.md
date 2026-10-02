# 08 — Development Guide

## 1. Tujuan

Dokumen ini adalah panduan developer untuk menjalankan, mengubah, menguji dan membangun Personal Developer Assistant tanpa mengabaikan boundary arsitektur yang sudah ada.

## 2. Repository structure

```
personal-developer-asistant/
├── backend-personal-app/
├── frontend-personal-app/
├── frontend-personal-admin/
└── docs/
```

Runtime development:

| Application | Port | Fungsi |
|---|---:|---|
| NestJS backend | 3002 | REST API dan business logic |
| User frontend | 3001 | aplikasi pengguna |
| Admin frontend | 3003 | Platform Admin |

Frontend memanggil `/backend-api/*`, kemudian Next.js rewrite meneruskannya ke backend.

## 3. Prerequisite

Source package saat ini menggunakan:
- pnpm 11.24.0
- Node.js runtime compatible dengan dependency project
- PostgreSQL >= 15
- Prisma 8.0.0-rc.15 CLI
- @prisma/orm-postgres 8.0.0-rc.11

Jangan mengganti versi Prisma secara terpisah tanpa mengecek compatibility antara `prisma`, `@prisma/orm-postgres`, contract dan migration workflow.

## 4. Initial setup

### Backend

```
cd backend-personal-app
pnpm install
```

Salin `.env.example` menjadi `.env`, kemudian isi:
- DATABASE_URL
- RESEND_API_KEY jika email delivery digunakan
- EMAIL_FROM
- FRONTEND_URL

### User frontend

```
cd frontend-personal-app
pnpm install
pnpm dev
```

Development server menggunakan port 3001.

### Admin frontend

```
cd frontend-personal-admin
pnpm install
pnpm dev
```

Development server menggunakan port 3003.

## 5. Backend commands

Dari `backend-personal-app`:

```
pnpm build
pnpm start
pnpm start:dev
pnpm start:prod

pnpm test
pnpm test:e2e
pnpm test:cov
pnpm lint

pnpm contract:emit
```

`contract:emit` digunakan ketika perubahan Prisma Contract memang membutuhkan regenerasi contract output. Setelah perubahan schema, ikuti migration/contract workflow yang digunakan repository; jangan hanya mengubah database manual tanpa memperbarui source contract.

## 6. Database workflow

Source schema utama berada pada:

```
backend-personal-app/src/prisma/contract.prisma
```

Repository menggunakan Prisma Contract workflow dan migration directory aplikasi.

Ketika menambah/mengubah model:

1. ubah contract
2. emit contract sesuai script project
3. lakukan database update/migration menggunakan workflow Prisma Contract repository
4. build backend
5. verifikasi generated contract dan database
6. commit schema + migration/generated artifacts yang memang dihasilkan workflow repository

Jangan menganggap perubahan `contract.prisma` otomatis membuat table database.

## 7. Authentication development

User login:
- frontend menyimpan `pda_access_token`
- backend mengembalikan JWT
- request berikutnya memakai Authorization Bearer

Workspace aktif:
- frontend menyimpan `pda_active_tenant_id`
- request tenant mengirim `X-Tenant-Id`

Platform Admin:
- login menggunakan user biasa
- backend `/auth/me` mengembalikan `isPlatformAdmin`
- admin frontend mengizinkan akses UI hanya jika flag tersebut true
- backend tetap melakukan enforcement melalui PlatformAdminGuard

## 8. Tenant development rule

Setiap resource tenant harus mempunyai tenant boundary yang jelas.

Pola yang harus dipertahankan:

```
JWT
 ↓
TenantContextGuard
 ↓
TenantRequest
 ↓
Service membership/tenant validation
 ↓
tenant-scoped query
```

Jangan membuat query resource tenant hanya berdasarkan resource ID jika resource tersebut dapat diakses lintas tenant.

Gunakan tenantId sebagai isolation boundary.

## 9. Permission development rule

Permission module saat ini:
- DASHBOARD
- PROJECTS
- TASKS
- KNOWLEDGE
- CODE_SNIPPETS
- DOCUMENTS
- PROJECT_MEMBERS
- WORKSPACE_MEMBERS
- WORKSPACE_SETTINGS

Action:
- CREATE
- READ
- UPDATE
- DELETE

Endpoint yang membutuhkan authorization harus menggunakan requirement permission yang sesuai.

Frontend boleh menyembunyikan button berdasarkan permission untuk UX, tetapi backend tetap harus melakukan authorization.

## 10. Workspace/member development

Member operation harus mempertimbangkan:
- tenant membership
- permission
- custom role
- system Owner protection
- workspace member capacity
- pending invitations

Jangan bypass `TenantService` untuk membuat atau menghapus membership tanpa mempertimbangkan business rule dan audit.

Jika flow khusus memang harus membuat TenantMember secara langsung, audit dan capacity rule harus tetap dipastikan.

## 11. Billing development

Billing terdiri dari:
- package
- package price
- feature
- package feature
- discount
- subscription
- invoice
- payment
- checkout session

Nilai uang disimpan dalam minor unit.

Contoh:

```
Rp 99.000
↓
9900000
```

Frontend melakukan konversi tampilan Rupiah ke minor unit sebelum request jika diperlukan.

Jangan menyimpan nominal billing sebagai floating point Rupiah.

### Sandbox

Provider aktif untuk development adalah SANDBOX.

Flow pre-tenant:

```
Package
 ↓
Checkout Session PENDING
 ↓
Sandbox success
 ↓
Tenant
 ↓
Owner membership
 ↓
Subscription
 ↓
Invoice
 ↓
Payment
```

MIDTRANS/XENDIT tersedia sebagai provider type tetapi bukan berarti flow production provider tersebut sudah aktif.

## 12. Discount development

Discount dapat berupa:
- PERCENTAGE
- FIXED_AMOUNT

Duration:
- ONCE
- RECURRING_CYCLES
- FOREVER

Perhatikan:
- minimum amount
- maximum discount
- usage limit
- validity
- package assignment

Jangan menganggap discount yang dibuat otomatis berlaku ke semua package; assignment package merupakan bagian terpisah.

## 13. Invoice development

Invoice harus diperlakukan sebagai historical snapshot.

Nilai utama:

```
original amount
- discount
+ tax
= final amount
```

Perubahan package price di masa depan tidak boleh mengubah histori invoice lama.

## 14. Audit development

AuditLog digunakan untuk event penting.

Saat menambahkan business operation baru, tentukan:
- action
- entity
- entityId
- actor/user
- tenant
- description
- metadata

Contoh:

```
WORKSPACE.MEMBER_ADDED
BILLING.PAYMENT_SUCCEEDED
AUTH.LOGIN_SUCCESS
```

Audit write tidak boleh menjadi alasan business transaction utama gagal apabila implementasi service saat ini mempertahankan non-blocking audit behavior.

## 15. Frontend development

User app:
```
Page
 ↓
lib/*.ts
 ↓
apiRequest()
 ↓
NestJS API
```

Admin app mengikuti pola yang sama tetapi memakai global Platform Admin endpoints.

Jangan membuat setiap page mengulang logic:
- Authorization header
- X-Tenant-Id
- API error parsing
- token storage

Gunakan abstraction pada `lib/api.ts`.

## 16. Adding a new backend API

Urutan yang disarankan:

1. Tentukan resource dan tenant scope.
2. Tentukan DTO/input.
3. Tentukan business rule.
4. Implement service.
5. Implement controller.
6. Pasang guard.
7. Tambahkan permission jika diperlukan.
8. Tambahkan audit event jika merupakan business mutation penting.
9. Tambahkan test.
10. Update `docs/03-backend-api.md`.
11. Update technical service documentation.

## 17. Adding a new frontend page

Urutan:

1. Tentukan route.
2. Tentukan API client pada `lib/*.ts`.
3. Definisikan response type.
4. Tentukan loading/error/empty state.
5. Implement page interaction.
6. Pastikan active tenant/permission digunakan jika tenant-scoped.
7. Pastikan mutation menghasilkan refresh state yang benar.
8. Update `docs/04-frontend.md`.
9. Update `docs/07-technical-frontend-flow.md`.

## 18. Adding a new database entity

Checklist:

- contract model
- primary key
- required fields
- enum
- foreign keys/relations
- unique constraints
- indexes
- tenant boundary jika resource tenant
- migration/update database
- service
- controller
- DTO
- tests
- documentation

ERD harus diperbarui jika relation berubah.

## 19. Testing checklist

Sebelum commit feature:

### Backend
```
pnpm build
pnpm lint
pnpm test
```

Jika feature mempunyai integration/e2e impact:
```
pnpm test:e2e
```

### Frontend
Dari masing-masing frontend:
```
pnpm build
pnpm lint
```

### Manual smoke test

Minimal:
- login
- pilih workspace
- akses dashboard
- lakukan mutation feature
- cek permission
- cek audit jika mutation diaudit
- cek billing jika feature berkaitan billing

## 20. Git workflow

Branch aktif pengembangan saat dokumentasi ini dibuat:

```
dev/project-members-api
```

Commit sebaiknya fokus pada satu perubahan logical.

Contoh:
```
feat: add platform admin payment monitoring
fix: enforce workspace member capacity
docs: add technical billing flow
```

Jangan mencampur perubahan schema besar, UI unrelated dan refactor besar dalam satu commit tanpa alasan.

## 21. Debugging order

Jika frontend mendapat API error:

1. lihat browser Network
2. cek HTTP status
3. cek response message
4. cek Authorization
5. cek X-Tenant-Id
6. cek backend log
7. cek guard
8. cek service
9. cek database

Jika error build TypeScript:
1. baca file dan line error
2. cek generated Prisma Contract jika error terkait ORM
3. cek import/module
4. jalankan backend build
5. jangan memperbaiki type error dengan `any` tanpa memahami contract

## 22. Common architectural mistakes

### Mengakses tenant resource tanpa tenant context
Salah karena dapat membuka risiko cross-tenant access.

### Mengandalkan frontend permission sebagai security
Salah. Backend adalah authorization boundary.

### Mengubah database langsung tanpa contract
Salah untuk workflow repository ini karena source schema dan generated contract dapat menjadi tidak sinkron.

### Menggunakan Prisma API lama
Repository menggunakan Prisma Contract API. Jangan otomatis menerapkan pola Prisma Client lama seperti `create({ data: ... })` jika API generated project menggunakan bentuk lain.

### Menganggap provider enum = provider production
SANDBOX adalah flow aktif saat ini.

### Membuat audit hanya pada happy path yang tidak mencakup alternate flow
Contoh penting: checkout sandbox dan invitation acceptance dapat membuat resource secara langsung sehingga audit harus diperiksa pada flow aktual, bukan hanya method umum.

## 23. Documentation maintenance

Jika perubahan menyentuh:

| Perubahan | Dokumentasi |
|---|---|
| Business rule | 01, 06 |
| Database | 02 |
| API route | 03 |
| Frontend page | 04, 07 |
| File/module architecture | 05 |
| Backend service logic | 06 |
| Development workflow | 08 |

Dokumentasi harus diperbarui dalam perubahan yang sama jika perubahan tersebut mengubah kontrak atau behavior yang didokumentasikan.

## 24. Definition of done

Feature dianggap selesai apabila:
- source code selesai
- authorization benar
- tenant isolation benar jika relevan
- business rule teruji
- database/contract sinkron
- audit ditambahkan jika relevan
- build berhasil
- test yang relevan berhasil
- dokumentasi diperbarui

## 25. Source of truth

Prioritas ketika terjadi perbedaan:

1. source code dan contract aktual
2. database/migration state
3. API behavior yang dapat diverifikasi
4. dokumentasi

Dokumentasi tidak boleh digunakan untuk membenarkan behavior yang tidak lagi ada di source code.
