# 06 — Technical Service Logic

Dokumen ini menjelaskan logic service utama berdasarkan source code branch dev/project-members-api.

## 1. Prinsip umum

HTTP → Controller → Guard → DTO/request → Service → Prisma Contract ORM → PostgreSQL

Controller menangani HTTP boundary. Guard memvalidasi authentication, tenant context atau permission. Service menjalankan business rule dan persistence.

## 2. AuthService

File: src/auth/auth.service.ts

### register()
Argon2 melakukan hashing password, kemudian UsersService.createUser() menyimpan user. Response hanya mengembalikan id, username, email dan name.

### login()
Flow: findByEmail → verifikasi Argon2 → buat JWT → audit LOGIN_SUCCESS → accessToken. Jika user tidak ditemukan atau password salah, dibuat audit AUTH.LOGIN_FAILED dan request berakhir Unauthorized.

JWT payload saat ini memuat sub=user id, username dan isPlatformAdmin.

### changePassword()
Service mengambil password hash, memverifikasi password lama dengan Argon2, melakukan hash password baru, lalu menyimpannya.

### Avatar
updateAvatar/removeAvatar mendelegasikan perubahan profile ke UsersService. Controller menangani upload file.

## 3. TenantService

File: src/tenants/tenant.service.ts

### create()
Create Tenant dilakukan dalam transaction, kemudian membuat system Owner role, seluruh permission module untuk Owner, TenantMember OWNER, dan audit WORKSPACE.CREATED.

### findAll()
Mengambil membership user, resolve Tenant dan nama custom role, lalu mengembalikan daftar workspace.

### getPermissions()
Mengambil membership, custom role dan TenantRolePermission, lalu membentuk matrix module dengan canCreate/canRead/canUpdate/canDelete.

### assertWorkspaceMemberCapacity()
Business rule kapasitas member menghitung active members + pending invitations dan membandingkannya dengan limit feature WORKSPACE_MEMBER pada subscription TRIAL, ACTIVE atau PAST_DUE. Jika penuh, service mengembalikan ConflictException dengan code WORKSPACE_MEMBER_LIMIT_REACHED serta currentMembers, pendingInvitations, limit dan remaining.

### addMember()
Validasi berurutan: membership current user, permission WORKSPACE_MEMBERS:CREATE, target user, duplicate membership, capacity, custom role dan larangan system role. Setelah TenantMember dibuat, audit WORKSPACE.MEMBER_ADDED dibuat.

### updateMemberRole()
Memastikan target member ada, Owner system role tidak dapat diubah, permission UPDATE tersedia, role berasal dari workspace, lalu roleId diperbarui.

### removeMember()
Memastikan requester mempunyai membership dan permission DELETE. System Owner tidak dapat dihapus. Setelah member dihapus, audit WORKSPACE.MEMBER_REMOVED dibuat.

### Invitation
Invitation menggunakan token unik dan expiration. Acceptance membuat TenantMember dengan role invitation dan menghasilkan audit WORKSPACE.MEMBER_ADDED.

## 4. BillingSubscriptionService

File: src/billing/subscription.service.ts

### getCurrent()
Validasi membership → ambil subscription tenant → pilih subscription terbaru berdasarkan createdAt → resolve package dan price → return detail.

### create()
Validasi membership, tidak ada subscription PENDING/TRIAL/ACTIVE/PAST_DUE, package dan price tersedia serta aktif, price cocok dengan package, dan provider harus SANDBOX. Period end dihitung +1 bulan untuk MONTHLY atau +1 tahun untuk YEARLY. Subscription dibuat PENDING dan dicatat audit.

### cancel()
Mencari subscription terbaru dengan status TRIAL/ACTIVE/PAST_DUE, mengubahnya menjadi CANCELLED dan mengisi cancelledAt.

## 5. BillingInvoiceService

File: src/billing/invoice.service.ts

Invoice membuat snapshot nilai komersial: originalAmountMinor, discountAmountMinor, taxAmountMinor dan finalAmountMinor. Snapshot juga menyimpan packageCode, packageName, billingPeriod dan currency.

Discount yang diterapkan dicatat pada InvoiceDiscount. Penggunaan discount dicatat pada DiscountUsage dan usageCount discount dinaikkan. Invoice creation menghasilkan BILLING.INVOICE_CREATED.

## 6. BillingPaymentService

File: src/billing/payment.service.ts

### create()
Validasi tenant member, invoice tenant dan invoice PENDING. Provider harus SANDBOX. Jika sudah ada payment PENDING untuk invoice, payment tersebut digunakan kembali. Payment baru memakai providerPaymentId SANDBOX-{invoiceId}, checkoutUrl sandbox://payment/{invoiceId}, expiry +24 jam dan amount invoice.finalAmountMinor.

### sandboxSucceed()
Payment PENDING menjadi SUCCEEDED, invoice menjadi SUCCEEDED, subscription menjadi ACTIVE, kemudian audit BILLING.PAYMENT_SUCCEEDED dibuat.

### sandboxFail()
Payment PENDING menjadi FAILED dan audit BILLING.PAYMENT_FAILED dibuat.

## 7. BillingCheckoutSessionService

File: src/billing/checkout-session.service.ts

Checkout session menyimpan userId, packageId, packagePriceId, workspaceName, discount, tax, final amount, provider, provider identifiers, status dan expiry.

Pada sandboxSucceed, session divalidasi lalu jalur provisioning dapat membuat Tenant, Owner role + permissions, TenantMember OWNER, TenantSubscription, SubscriptionInvoice dan Payment, kemudian checkout session ditandai SUCCEEDED dan lifecycle dicatat ke audit.

## 8. AuditService

File: src/audit/audit.service.ts

### create()
Input audit mencakup userId, tenantId, action, entity, entityId, description, metadata, ipAddress dan userAgent. Metadata diserialisasi sebagai JSON string.

Audit write dibungkus try/catch. Jika persistence audit gagal, error dicatat ke server log dan tidak dilempar kembali ke business operation.

### findAll()
Filter tersedia q, action, entity, tenantId dan userId. Service melakukan enrichment user name/email dan workspace name, parse metadata JSON, lalu mengurutkan newest-first.

### findOne()
Mencari log berdasarkan id dari hasil findAll().

## 9. Security model

Tenant-scoped flow: JWT → TenantContextGuard → Controller → service membership check → tenant-scoped query.

Validasi membership di service memberikan defense-in-depth walaupun controller telah menggunakan TenantContextGuard.

Platform Admin service memakai scope global dan dilindungi JwtAuthGuard + PlatformAdminGuard.

## 10. Error pattern

UnauthorizedException digunakan untuk authentication gagal; ForbiddenException untuk authorization; NotFoundException untuk resource yang tidak ditemukan; ConflictException untuk state/business rule yang tidak valid.

Contoh member limit: WORKSPACE_MEMBER_LIMIT_REACHED.

## 11. Audit event mapping

| Area | Event |
|---|---|
| Auth | AUTH.LOGIN_SUCCESS |
| Auth | AUTH.LOGIN_FAILED |
| Workspace | WORKSPACE.CREATED |
| Workspace | WORKSPACE.MEMBER_ADDED |
| Workspace | WORKSPACE.MEMBER_REMOVED |
| Catalog | BILLING.PACKAGE_CREATED / UPDATED |
| Catalog | BILLING.FEATURE_CREATED / UPDATED |
| Catalog | BILLING.PRICE_CREATED / UPDATED |
| Discount | BILLING.DISCOUNT_CREATED / UPDATED |
| Subscription | BILLING.SUBSCRIPTION_CREATED / CANCELLED |
| Invoice | BILLING.INVOICE_CREATED |
| Payment | BILLING.PAYMENT_CREATED / SUCCEEDED / FAILED |

## 12. Implementation notes

Dokumen ini menggambarkan implementation source saat ini. Provider MIDTRANS/XENDIT sudah tersedia sebagai enum, tetapi flow payment aktif saat ini adalah SANDBOX.
