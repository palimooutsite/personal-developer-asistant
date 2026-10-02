# 09 — API Reference

Dokumen ini adalah reference operasional endpoint utama. Detail request mengikuti Controller + DTO pada source saat ini.

## 1. Base URL

Development:

```
http://localhost:3002
```

Melalui frontend proxy:

```
/backend-api
```

## 2. Authentication headers

JWT endpoint:

```
Authorization: Bearer <JWT>
```

Tenant-scoped endpoint:

```
X-Tenant-Id: <TENANT_ID>
```

Catatan: beberapa tenant controller menggunakan `:tenantId` atau `:id` pada URL dan TenantContextGuard untuk memvalidasi membership. Header X-Tenant-Id tetap merupakan mekanisme context yang digunakan frontend API client pada resource tenant.

---

# 3. Authentication API

## POST /auth/register

Public.

### Request

```json
{
  "username": "developer01",
  "email": "developer@example.com",
  "password": "password123",
  "name": "Developer"
}
```

Rules:
- username: required, max 50
- email: valid email, max 255
- password: 8–100 karakter
- name optional, max 100

### Response

Public user response dari AuthService.

### Contoh

```http
POST /backend-api/auth/register
Content-Type: application/json
```

## POST /auth/login

Public.

### Request

```json
{
  "email": "developer@example.com",
  "password": "password123"
}
```

### Response

Menghasilkan access token dan user information sesuai LoginUserResponse.

### Business error

Credential salah menghasilkan Unauthorized dan audit `AUTH.LOGIN_FAILED`.

## GET /auth/me

JWT required.

Mengambil user berdasarkan JWT.

## POST /auth/profile

JWT required.

Request:

```json
{
  "name": "Nama Baru"
}
```

## POST /auth/password

JWT required.

Request:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

Password baru minimal 8 karakter.

Success:

```json
{
  "message": "Password berhasil diubah"
}
```

## POST /auth/avatar

JWT required. Multipart field: `file`.

Allowed:
- JPG
- PNG
- WebP

Maximum 2 MB.

## POST /auth/avatar/remove

JWT required.

Menghapus avatar dan file avatar lokal jika URL berasal dari storage avatar backend.

---

# 4. Tenant API

## GET /tenants

JWT required.

Mengambil workspace user.

## POST /tenants

JWT required.

Request:

```json
{
  "name": "My Workspace"
}
```

Create workspace melakukan provisioning Owner role, permission dan OWNER membership.

## GET /tenants/:id

JWT + TenantContext.

Mengambil workspace.

## PATCH /tenants/:id

JWT.

Request:

```json
{
  "name": "Workspace Baru"
}
```

## GET /tenants/:id/permissions

JWT + TenantContext.

Mengambil permission matrix user.

## GET /tenants/:id/members

JWT.

Mengambil member workspace.

## POST /tenants/:id/members

JWT.

Request:

```json
{
  "userId": "<USER_UUID>",
  "roleId": "<ROLE_UUID>"
}
```

Business rules mencakup membership, permission, duplicate member, role validity dan member capacity.

## PATCH /tenants/:id/members/:userId

JWT.

Request:

```json
{
  "roleId": "<ROLE_UUID>"
}
```

System Owner tidak boleh diganti role-nya.

## DELETE /tenants/:id/members/:userId

JWT.

Menghapus member setelah authorization dan Owner protection.

## POST /tenants/:id/invitations

JWT.

Request:

```json
{
  "email": "member@example.com",
  "roleId": "<ROLE_UUID>"
}
```

Membuat invitation dengan token dan expiration.

## POST /tenants/invitations/accept

JWT.

Request:

```json
{
  "token": "<INVITATION_TOKEN>"
}
```

Success:

```json
{
  "message": "...",
  "tenantId": "...",
  "role": "..."
}
```

---

# 5. Tenant Role API

Base:

`/tenants/:tenantId/roles`

Authorization menggunakan JWT, TenantContext dan permission WORKSPACE_SETTINGS.

| Method | Endpoint | Permission |
|---|---|---|
| GET | /tenants/:tenantId/roles | READ |
| POST | /tenants/:tenantId/roles | CREATE |
| POST | /tenants/:tenantId/roles/migrate-legacy-members | UPDATE |
| GET | /tenants/:tenantId/roles/:roleId | READ |
| PATCH | /tenants/:tenantId/roles/:roleId | UPDATE |
| DELETE | /tenants/:tenantId/roles/:roleId | DELETE |

Request/response mengikuti DTO dan TenantRoleService pada source.

---

# 6. Dashboard API

## GET /dashboard/summary

Guards:
- JWT
- TenantContext
- Permission DASHBOARD:READ

Header:

```
X-Tenant-Id: <TENANT_ID>
```

Menghasilkan aggregate dashboard workspace seperti project, task, knowledge, snippet dan tag summary.

---

# 7. Project API

Base: `/projects`

Guards:
- JWT
- TenantContext
- PermissionGuard

| Method | Endpoint | Permission |
|---|---|---|
| GET | /projects | PROJECTS:READ |
| GET | /projects/:id | PROJECTS:READ |
| POST | /projects | PROJECTS:CREATE |
| PATCH | /projects/:id | PROJECTS:UPDATE |
| DELETE | /projects/:id | PROJECTS:DELETE |

Project member:

| Method | Endpoint | Permission |
|---|---|---|
| GET | /projects/:id/members | PROJECT_MEMBERS:READ |
| POST | /projects/:id/members | PROJECT_MEMBERS:CREATE |
| POST | /projects/:id/members/bulk | PROJECT_MEMBERS:CREATE |
| PATCH | /projects/:id/members/:userId | PROJECT_MEMBERS:UPDATE |
| DELETE | /projects/:id/members/:userId | PROJECT_MEMBERS:DELETE |

Contoh create:

```json
{
  "name": "PDA",
  "description": "Personal Developer Assistant"
}
```

Actual fields harus mengikuti CreateProjectDto.

---

# 8. Task API

Base:

`/projects/:projectId/tasks`

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

List query:
- page
- limit
- all

Contoh:

```
GET /backend-api/projects/<PROJECT_ID>/tasks?page=1&limit=10
```

---

# 9. Knowledge API

Base: `/knowledge`

| Method | Endpoint | Permission |
|---|---|---|
| POST | /knowledge | KNOWLEDGE:CREATE |
| GET | /knowledge | KNOWLEDGE:READ |
| GET | /knowledge/:id | KNOWLEDGE:READ |
| PATCH | /knowledge/:id | KNOWLEDGE:UPDATE |
| DELETE | /knowledge/:id | KNOWLEDGE:DELETE |

Query GET mengikuti QueryKnowledgeDto.

---

# 10. Snippet API

Base: `/snippets`

| Method | Endpoint | Permission |
|---|---|---|
| POST | /snippets | CODE_SNIPPETS:CREATE |
| GET | /snippets | CODE_SNIPPETS:READ |
| GET | /snippets/:id | CODE_SNIPPETS:READ |
| PATCH | /snippets/:id | CODE_SNIPPETS:UPDATE |
| DELETE | /snippets/:id | CODE_SNIPPETS:DELETE |

Query GET mengikuti QuerySnippetDto.

---

# 11. Document API

Base: `/documents`

| Method | Endpoint | Permission |
|---|---|---|
| POST | /documents/upload | DOCUMENTS:CREATE |
| POST | /documents | DOCUMENTS:CREATE |
| GET | /documents | DOCUMENTS:READ |
| GET | /documents/:id | DOCUMENTS:READ |
| GET | /documents/:id/file | DOCUMENTS:READ |
| PATCH | /documents/:id | DOCUMENTS:UPDATE |
| DELETE | /documents/:id | DOCUMENTS:DELETE |

Upload multipart field:
`file`

Allowed MIME:
- application/pdf
- text/plain
- text/markdown
- DOCX MIME

Maximum 10 MB.

File response menggunakan StreamableFile dan Content-Disposition inline.

---

# 12. Billing Catalog API

Public:

| Method | Endpoint |
|---|---|
| GET | /billing/catalog/packages |
| GET | /billing/catalog/packages/:id |
| GET | /billing/catalog/packages/:id/features |
| GET | /billing/catalog/features |
| GET | /billing/catalog/packages/:packageId/prices |

Platform Admin:

| Method | Endpoint |
|---|---|
| POST | /billing/catalog/seed-defaults |
| POST | /billing/catalog/packages |
| PATCH | /billing/catalog/packages/:id |
| POST | /billing/catalog/features |
| PATCH | /billing/catalog/features/:id |
| POST | /billing/catalog/packages/:packageId/prices |
| PATCH | /billing/catalog/prices/:id |
| POST | /billing/catalog/packages/:packageId/features/:featureId |
| DELETE | /billing/catalog/packages/:packageId/features/:featureId |

Admin endpoints memerlukan:

```
Authorization: Bearer <PLATFORM_ADMIN_JWT>
```

Price amount menggunakan amountMinor.

---

# 13. Discount API

Semua endpoint berikut Platform Admin:

| Method | Endpoint |
|---|---|
| GET | /billing/discounts |
| GET | /billing/discounts/:id |
| POST | /billing/discounts |
| PATCH | /billing/discounts/:id |
| GET | /billing/discounts/:id/packages |
| POST | /billing/discounts/:id/packages/:packageId |
| DELETE | /billing/discounts/:id/packages/:packageId |

Discount package assignment menggunakan POST untuk enable dan DELETE untuk remove.

---

# 14. Tenant Feature API

Base:

`/billing/tenants/:tenantId/features`

## GET /

JWT + TenantContext.

Mengambil feature subscription tenant.

## GET /:code

JWT + TenantContext.

Optional query:

```
?currentUsage=10
```

Dipakai untuk mengecek access/limit feature.

---

# 15. Subscription API

Base:

`/billing/tenants/:tenantId/subscription`

## GET /

Mengambil current/latest subscription.

## POST /

Request:

```json
{
  "packageId": "<PACKAGE_UUID>",
  "packagePriceId": "<PRICE_UUID>",
  "provider": "SANDBOX"
}
```

Provider optional pada DTO, tetapi implementation saat ini hanya menerima SANDBOX untuk flow create.

## PATCH /cancel

Membatalkan subscription aktif/trial/past-due.

---

# 16. Invoice API

Base:

`/billing/tenants/:tenantId/invoices`

## GET /

List invoice.

## GET /:invoiceId

Detail invoice.

## POST /preview

Request:

```json
{
  "discountCode": "PROMO10"
}
```

Discount code optional.

## POST /

Create invoice.

Request sama-sama menerima optional discountCode.

---

# 17. Payment API

Base:

`/billing/tenants/:tenantId`

## GET /payments

List payment.

## GET /payments/:paymentId

Detail payment.

## POST /invoices/:invoiceId/payment

Request:

```json
{
  "provider": "SANDBOX"
}
```

Payment dibuat terhadap invoice PENDING.

## POST /payments/:paymentId/sandbox/succeed

Mengubah payment SANDBOX PENDING menjadi SUCCEEDED dan menyelesaikan invoice/subscription terkait sesuai service logic.

## POST /payments/:paymentId/sandbox/fail

Mengubah payment SANDBOX PENDING menjadi FAILED.

---

# 18. Tenant Checkout API

## POST /billing/tenants/:tenantId/checkout

JWT + TenantContext.

Request:

```json
{
  "packageId": "<PACKAGE_UUID>",
  "packagePriceId": "<PRICE_UUID>",
  "discountCode": "PROMO10",
  "provider": "SANDBOX"
}
```

Digunakan untuk checkout workspace yang sudah memiliki tenant.

---

# 19. Pre-Tenant Checkout Session API

## POST /billing/checkout-sessions

JWT.

Request:

```json
{
  "packageId": "<PACKAGE_UUID>",
  "packagePriceId": "<PRICE_UUID>",
  "workspaceName": "Workspace Saya",
  "discountCode": "PROMO10",
  "provider": "SANDBOX"
}
```

Rules:
- workspaceName 2–120 karakter
- discountCode optional max 50
- provider saat ini SANDBOX

## POST /billing/checkout-sessions/:sessionId/sandbox/succeed

JWT.

Menyelesaikan checkout session sandbox dan menjalankan provisioning workspace/billing.

## POST /billing/checkout-sessions/:sessionId/sandbox/fail

JWT.

Mengubah checkout session menjadi FAILED.

---

# 20. Platform Admin Subscription API

## GET /billing/admin/subscriptions

JWT + PlatformAdmin.

Global subscription monitoring.

## GET /billing/admin/subscriptions/:id

JWT + PlatformAdmin.

Detail subscription.

Kedua endpoint read-only.

---

# 21. Platform Admin Invoice API

## GET /billing/admin/invoices

JWT + PlatformAdmin.

Global invoice monitoring.

## GET /billing/admin/invoices/:id

JWT + PlatformAdmin.

Detail invoice.

Read-only.

---

# 22. Platform Admin Payment API

## GET /billing/admin/payments

JWT + PlatformAdmin.

Global payment monitoring.

## GET /billing/admin/payments/:id

JWT + PlatformAdmin.

Detail payment.

Read-only.

---

# 23. Audit API

## GET /audit-logs

JWT + PlatformAdmin.

Query:
- q
- action
- entity
- tenantId
- userId

Contoh:

```
GET /backend-api/audit-logs?action=BILLING.PAYMENT_SUCCEEDED
```

## GET /audit-logs/:id

JWT + PlatformAdmin.

Mengambil detail audit.

---

# 24. Standard error handling

NestJS error response mengikuti HTTP exception dari backend.

Kategori umum:
- 400 Bad Request — input invalid/business validation
- 401 Unauthorized — JWT/credential invalid
- 403 Forbidden — permission/platform admin tidak mencukupi
- 404 Not Found — resource tidak ditemukan
- 409 Conflict — business state/unique constraint conflict

Contoh business error member capacity:

```json
{
  "code": "WORKSPACE_MEMBER_LIMIT_REACHED",
  "message": "Limit member workspace pada paket saat ini sudah tercapai",
  "currentMembers": 2,
  "pendingInvitations": 0,
  "limit": 2,
  "remaining": 0
}
```

## 25. Request sequence

Tenant request:

```
Browser
 ↓
Authorization: Bearer JWT
X-Tenant-Id
 ↓
Next.js /backend-api rewrite
 ↓
JwtAuthGuard
 ↓
TenantContextGuard
 ↓
PermissionGuard
 ↓
Controller
 ↓
Service
 ↓
Prisma Contract
 ↓
PostgreSQL
```

Platform Admin request:

```
Browser
 ↓
Authorization: Bearer JWT
 ↓
JwtAuthGuard
 ↓
PlatformAdminGuard
 ↓
Controller
 ↓
Service
 ↓
Database
```

## 26. API documentation rule

Jika endpoint baru ditambahkan, dokumentasi ini harus diperbarui bersama perubahan source.

Jika request/response tidak dapat dipastikan dari Controller + DTO + Service saat ini, jangan membuat contoh field tambahan yang belum terbukti.
