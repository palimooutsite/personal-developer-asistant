# 06 — Technical Service Logic

Dokumen ini menjelaskan logic service backend utama berdasarkan source code branch `dev/project-members-api`.

## 1. Prinsip umum

HTTP → Controller → Guard → DTO/request → Service → Prisma Contract ORM → PostgreSQL.

Controller menangani HTTP boundary. Guard memvalidasi authentication, tenant context atau permission. Service menjalankan business rule dan persistence.

## 2. AuthService

File: `src/auth/auth.service.ts`

### register()
Argon2 melakukan hashing password, kemudian UsersService.createUser() menyimpan user. Public response tidak mengembalikan password hash.

### login()
Flow: findByEmail → Argon2 verify → JWT → AUTH.LOGIN_SUCCESS → accessToken. User tidak ditemukan atau password salah menghasilkan AUTH.LOGIN_FAILED dan UnauthorizedException.

JWT payload memuat user id, username dan `isPlatformAdmin`.

### changePassword()
Verifikasi password lama dengan Argon2, hash password baru, lalu update password hash.

### Avatar
Update/remove avatar didelegasikan ke UsersService; controller menangani upload.

## 3. UsersService

File: `src/users/user.service.ts`

### createUser()
Menyimpan username, email, passwordHash dan name.

### findByEmail()
Email dinormalisasi trim/lowercase. Digunakan AuthService untuk login dan mengambil passwordHash serta isPlatformAdmin.

### findById()
Mengembalikan id, username, email, name, avatarUrl dan isPlatformAdmin.

### searchUsers()
Requester harus menjadi member workspace dan OWNER/ADMIN. Service mengecualikan user yang sudah menjadi member workspace, melakukan filter username/email/name, excludeUserIds dan pagination maksimum 10.

Response memiliki data dan meta page/limit/total/totalPages.

### Profile/password/avatar mutation
UsersService menyediakan updateProfile, updatePassword dan updateAvatar.

## 4. TenantService

File: `src/tenants/tenant.service.ts`

### create()
Transaction membuat Tenant, Owner role, permissions, TenantMember OWNER dan audit WORKSPACE.CREATED.

### findAll()
Mengambil workspace melalui TenantMember user.

### getPermissions()
Mengambil role dan TenantRolePermission lalu membentuk permission matrix.

### assertWorkspaceMemberCapacity()
Menghitung active members + pending invitations lalu membandingkannya dengan feature WORKSPACE_MEMBER. Subscription yang dihitung: TRIAL, ACTIVE, PAST_DUE.

Jika penuh: `WORKSPACE_MEMBER_LIMIT_REACHED`, dengan currentMembers, pendingInvitations, limit dan remaining.

### addMember()
Validasi membership requester, permission, target user, duplicate membership, capacity, role dan system-role restriction. Setelah create TenantMember, audit WORKSPACE.MEMBER_ADDED.

### updateMemberRole()
Owner system role tidak dapat diubah. Role target harus valid untuk workspace.

### removeMember()
Owner system role tidak dapat dihapus. Setelah delete dibuat audit WORKSPACE.MEMBER_REMOVED.

### Invitation
Create menggunakan token dan expiration. Acceptance membuat TenantMember berdasarkan role invitation dan menghasilkan WORKSPACE.MEMBER_ADDED.

## 5. TenantRoleService

File: `src/tenants/roles/tenant-role.service.ts`

### ensureSystemRoles()
Memastikan Owner, Admin dan Member tersedia. System role diberi full permission seluruh PERMISSION_MODULES.

### migrateLegacyMembers()
Member lama tanpa roleId dipetakan OWNER → Owner, ADMIN → Admin, lainnya → Member. Response mencatat totalMembers, migrated dan alreadyMigrated.

### list/create/findOne/update/remove()
Custom role dikelola per tenant. Nama role harus unik. System role tidak boleh diubah/dihapus. Role yang masih dipakai member tidak boleh dihapus.

### replacePermissions()
Permission dinormalisasi per module. Existing rows di-update, missing rows dibuat. Implementasi menghindari delete-all/create-all untuk mengurangi race condition unique constraint roleId + module.

### hasPermission()
Membership → roleId → TenantRolePermission → module/action → boolean. Tanpa roleId atau permission, hasil false.

## 6. ProjectsService

File: `src/projects/projects.service.ts`

### create()
Hitung project tenant → BillingFeatureService.assertWithinLimit(PROJECT) → transaction create Project + ProjectMember OWNER.

### findAll()/findOne()
Project hanya dikembalikan jika requester memiliki ProjectMember dan project berada pada tenant aktif.

### getMembership()
Security helper memastikan project berada pada tenant dan requester adalah ProjectMember.

### update()
Hanya OWNER/ADMIN project. Update name, description dan status.

### remove()
Hanya OWNER. ProjectMember dan Project dihapus dalam transaction.

### addMember()/addMembers()
Requester harus OWNER/ADMIN. Target harus user valid, TenantMember workspace aktif dan belum ProjectMember. Bulk melakukan deduplikasi userId.

### updateMemberRole()
OWNER tidak dapat diubah. OWNER/ADMIN dapat mengubah role member.

### removeMember()
OWNER/ADMIN dapat menghapus member selain OWNER.

## 7. TasksService

File: `src/tasks/tasks.service.ts`

### create()
requireMutationAccess → validasi project/tenant → hitung usage → assertWithinLimit(TASK) → create Task. Default priority MEDIUM.

### requireProjectMembership()
Requester harus ProjectMember pada project tenant aktif.

### requireMutationAccess()
Mutation task dibatasi role OWNER, ADMIN atau DEVELOPER.

### findAll()
Mengambil task project/tenant dan resolve assignee. Jika all=false, pagination limit maksimum 50; jika all=true seluruh result dikembalikan.

### findOne/update/remove()
Memastikan project membership dan task berada pada project + tenant yang benar. Mutation memerlukan mutation role.

### Assignee
Tambah/remove assignee dilakukan setelah validasi membership/project sesuai business rule service.

## 8. KnowledgeService

File: `src/knowledge/knowledge.service.ts`

Article selalu tenant-scoped. Create memvalidasi tenant, slug uniqueness per tenant dan feature limit KNOWLEDGE. Find/update/remove tetap menggunakan tenant boundary.

## 9. TagsService

File: `src/knowledge/tags.service.ts`

Tag tenant-scoped. Create memvalidasi uniqueness nama dalam tenant. Find/update/remove menggunakan tenantId.

## 10. ArticleTagsService

File: `src/knowledge/article-tags.service.ts`

Mengelola KnowledgeArticle ↔ Tag. Add melakukan article tenant check, tag tenant check dan duplicate relation check sebelum create mapping.

## 11. SnippetsService

File: `src/snippets/snippets.service.ts`

CodeSnippet tenant-scoped. Create mengecek feature limit CODE_SNIPPET. Find/update/remove menggunakan tenant boundary dan query DTO.

## 12. SnippetTagsService

File: `src/snippets/snippet-tags.service.ts`

Mengelola CodeSnippet ↔ Tag dengan validasi tenant untuk kedua resource dan duplicate mapping protection.

## 13. DocumentsService

File: `src/documents/documents.service.ts`

Document mempunyai dua persistence layer: metadata di PostgreSQL dan binary di filesystem.

### create/upload
Memvalidasi tenant/user, file type, file size dan storage path. Feature DOCUMENT digunakan sebagai limit.

### findAll/findOne
Query menggunakan createdBy + tenantId sehingga document user lain tidak ikut terbaca.

### getFile
findOne → cek filePath dengan filesystem → jika file hilang NotFoundException → controller mengirim file.

### update
Saat ini mengubah metadata title dan description, bukan binary file.

### remove
Delete metadata lalu unlink file. Kegagalan unlink tidak membatalkan delete database.

## 14. DashboardService

File: `src/dashboard/dashboard.service.ts`

getSummary adalah aggregate read service.

Project dihitung dari project membership user dalam tenant. Task dihitung dari task project yang user ikuti. Knowledge dan snippet dihitung berdasarkan tenant + createdBy. Tag dihitung berdasarkan tenant.

Output:
- projects total/byStatus
- tasks total/byStatus/byPriority
- knowledge total
- snippets total/byLanguage
- tags total

Catatan: dashboard saat ini tidak menghitung semua resource tenant secara universal; sebagian aggregate mengikuti ownership/relationship user.

## 15. BillingFeatureService

File: `src/billing/feature.service.ts`

Menjadi enforcement layer package feature.

Flow assertWithinLimit:
subscription → package → feature → limitValue → compare currentUsage.

Feature resource:
PROJECT, TASK, KNOWLEDGE, CODE_SNIPPET, DOCUMENT, WORKSPACE_MEMBER.

Feature dapat BOOLEAN atau LIMIT.

## 16. BillingCatalogService

File: `src/billing/catalog.service.ts`

Mengelola package, feature, price dan package-feature mapping.

Package: code, name, description, sortOrder, active.

Feature: code, name, description, valueType, unit, active.

Price: billing period, amountMinor, currency, version, active.

PackageFeature: enabled dan limitValue.

Mutation catalog menghasilkan audit BILLING events.

## 17. BillingDiscountService

File: `src/billing/discount.service.ts`

Mendukung PERCENTAGE/FIXED_AMOUNT dan duration ONCE/RECURRING_CYCLES/FOREVER.

Rule dapat mencakup minimum amount, maximum discount, usage limit, validity dan package assignment.

DiscountPackage menentukan package yang eligible. Usage dicatat melalui DiscountUsage sesuai invoice flow.

## 18. BillingSubscriptionService

File: `src/billing/subscription.service.ts`

getCurrent: validasi membership → subscription terbaru → package + price.

create: validasi member, existing subscription state, package/price aktif dan cocok, provider SANDBOX → hitung period → create PENDING subscription → audit.

MONTHLY = +1 bulan. YEARLY = +1 tahun.

cancel: subscription terbaru TRIAL/ACTIVE/PAST_DUE dapat menjadi CANCELLED.

## 19. BillingInvoiceService

File: `src/billing/invoice.service.ts`

Invoice adalah historical snapshot.

Formula:
originalAmountMinor - discountAmountMinor + taxAmountMinor = finalAmountMinor.

Invoice menyimpan package snapshot, billing period, currency dan nilai tagihan. InvoiceDiscount menyimpan discount yang diterapkan. Invoice creation menghasilkan BILLING.INVOICE_CREATED.

## 20. BillingPaymentService

File: `src/billing/payment.service.ts`

create: validasi tenant member, invoice ownership, invoice PENDING dan provider SANDBOX. Pending payment dapat digunakan kembali.

Sandbox payment menggunakan providerPaymentId SANDBOX-{invoiceId}, checkoutUrl sandbox://payment/{invoiceId} dan expiry +24 jam.

sandboxSucceed: Payment PENDING → SUCCEEDED → Invoice SUCCEEDED → Subscription ACTIVE → audit.

sandboxFail: Payment PENDING → FAILED → audit.

## 21. BillingCheckoutService

File: `src/billing/checkout.service.ts`

Untuk tenant yang sudah ada.

Flow:
tenant → package/price → optional discount → calculation → subscription/invoice/payment flow.

Service memvalidasi package, price, provider dan tenant context.

## 22. BillingCheckoutSessionService

File: `src/billing/checkout-session.service.ts`

Untuk pre-tenant checkout. Session menyimpan userId, packageId, packagePriceId, workspaceName, discount, tax, final amount, provider, identifiers, status dan expiry.

sandboxSucceed dapat melakukan provisioning:
Tenant → Owner role + permissions → TenantMember OWNER → TenantSubscription → SubscriptionInvoice → Payment → session SUCCEEDED → audit.

## 23. Platform Admin Billing Services

### BillingAdminSubscriptionService
File: `src/billing/admin-subscription.service.ts`

Global read service. Enrich subscription dengan workspace, package dan price. Read-only.

### BillingAdminInvoiceService
File: `src/billing/admin-invoice.service.ts`

Global invoice read service. Enrich workspace, package dan latest payment status. Read-only.

### BillingAdminPaymentService
File: `src/billing/admin-payment.service.ts`

Global payment read service. Enrich workspace, subscription dan invoice/package. Read-only.

Ketiganya memakai global scope dan PlatformAdminGuard pada controller.

## 24. AuditService

File: `src/audit/audit.service.ts`

create menerima userId, tenantId, action, entity, entityId, description, metadata, ipAddress dan userAgent. Metadata diserialisasi sebagai JSON.

Audit write bersifat non-blocking: failure dicatat server log dan tidak dilempar kembali ke business operation.

findAll mendukung q, action, entity, tenantId dan userId; service melakukan enrichment actor/workspace, parse metadata dan sort newest-first.

findOne mengambil detail audit berdasarkan id.

## 25. Cross-service dependencies

```
AuthService
 ├── UsersService
 └── AuditService

TenantService
 ├── BillingFeatureService
 ├── TenantRoleService
 └── AuditService

ProjectsService
 └── BillingFeatureService

TasksService
 └── BillingFeatureService

KnowledgeService
 └── BillingFeatureService

SnippetsService
 └── BillingFeatureService

DocumentsService
 └── BillingFeatureService

Billing services
 └── AuditService

DashboardService
 └── PrismaService
```

## 26. Security model

Tenant resource:
JWT → TenantContextGuard → Controller → service membership/resource validation → tenant-scoped query.

Platform Admin:
JWT → PlatformAdminGuard → global admin service → database.

Frontend permission hanya UX; backend tetap source of truth authorization.

## 27. Error pattern

- UnauthorizedException — authentication
- ForbiddenException — authorization/tenant/project membership
- NotFoundException — resource tidak ditemukan
- ConflictException — duplicate/business state conflict

## 28. Audit event mapping

| Service | Event |
|---|---|
| AuthService | AUTH.LOGIN_SUCCESS / AUTH.LOGIN_FAILED |
| TenantService | WORKSPACE.CREATED / MEMBER_ADDED / MEMBER_REMOVED |
| CatalogService | BILLING.PACKAGE_CREATED / UPDATED |
| CatalogService | BILLING.FEATURE_CREATED / UPDATED |
| CatalogService | BILLING.PRICE_CREATED / UPDATED |
| DiscountService | BILLING.DISCOUNT_CREATED / UPDATED |
| SubscriptionService | BILLING.SUBSCRIPTION_CREATED / CANCELLED |
| InvoiceService | BILLING.INVOICE_CREATED |
| PaymentService | BILLING.PAYMENT_CREATED / SUCCEEDED / FAILED |
| CheckoutSessionService | workspace/billing lifecycle events |

## 29. Important implementation notes

1. Prisma Contract API adalah persistence abstraction source saat ini.
2. TenantId adalah isolation boundary utama resource workspace.
3. Billing amount menggunakan minor unit.
4. Payment flow aktif saat ini adalah SANDBOX.
5. AuditLog adalah business traceability, bukan pengganti operational logging.
6. Flow yang membuat resource secara langsung harus tetap menerapkan business rule dan audit yang relevan.
7. Jika business rule service berubah, dokumentasi ini harus diperbarui bersama source.
