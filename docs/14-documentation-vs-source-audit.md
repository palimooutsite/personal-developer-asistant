# 14 — Documentation vs Source Audit

## 1. Tujuan

Audit ini membandingkan dokumentasi dengan source code aktual pada branch `dev/project-members-api`, dengan fokus pada API, service logic, database contract, tenant isolation, permission, billing, audit, dan struktur dokumentasi.

Status: MATCH = sesuai source; GAP = implementasi belum tercermin/lengkap di dokumentasi; DOC STALE = dokumentasi tertinggal; TECHNICAL NOTE = catatan teknis penting.

## 2. Hasil ringkas

| Area | Status | Catatan |
|---|---|---|
| Auth API | MATCH | Route register/login/me/profile/password/avatar sesuai controller |
| Tenant/member API | MATCH | Route utama dan custom-role sesuai controller |
| Project API | MATCH | CRUD dan project-member/bulk-member tersedia |
| Task API | MATCH | CRUD dan assignee route sesuai controller |
| Knowledge/Snippet/Document | MATCH | Route utama sesuai controller |
| Billing catalog | MATCH | Public read dan Platform Admin mutation sesuai controller |
| Tenant billing | MATCH | Subscription, invoice, payment dan checkout sesuai controller |
| Pre-tenant checkout | MATCH | Session create + sandbox success/fail tersedia |
| Platform Admin billing | MATCH | Subscription/invoice/payment read-only |
| Audit logging | MATCH | AuditService menangkap kegagalan write tanpa melempar ulang |
| Database contract | MATCH | Model/relasi utama ditemukan di contract.prisma |
| Workspace member limit | MATCH + GAP | Enforcement tersedia, tetapi usage display belum menghitung WORKSPACE_MEMBER |
| docs/README.md | DOC STALE | Sebelumnya hanya mendaftarkan dokumen 01–05 walaupun repository sudah memiliki 01–14 |

## 3. Temuan penting

### 3.1 Workspace member limit

`TenantService.assertWorkspaceMemberCapacity()` menghitung active `TenantMember` + pending, belum accepted, belum expired `TenantInvitation`, lalu membandingkannya dengan `SubscriptionPackageFeature.limitValue` untuk `WORKSPACE_MEMBER`. Rule ini diterapkan pada add member, create invitation, dan accept invitation.

### 3.2 Workspace member usage belum dihitung oleh BillingFeatureService

`BillingFeatureService.listSubscriptionFeatures()` menghitung usage untuk PROJECT, TASK, KNOWLEDGE, CODE_SNIPPET, dan DOCUMENT, tetapi belum menghitung `WORKSPACE_MEMBER`. Akibatnya endpoint daftar feature subscription dapat menampilkan `currentUsage = 0` walaupun workspace sudah memiliki member.

Dampak: enforcement limit tetap berjalan melalui `TenantService`, tetapi tampilan usage feature dapat tidak sesuai. Rekomendasi: tambahkan perhitungan member; bila ingin konsisten dengan enforcement, pertimbangkan reserved usage = active members + pending invitations.

### 3.3 Audit logging

`AuditService.create()` menggunakan try/catch. Jika persistence audit gagal, error ditulis ke server log dan tidak dilempar kembali ke business operation. Ini sesuai dokumentasi non-blocking.

Technical note: ketika AuditService dipanggil dari transaction callback, service menggunakan `this.prisma.client`, bukan transaction client `tx`. Audit record karena itu bukan bagian dari transaction database yang sama dan dapat tetap tersimpan bila transaction bisnis kemudian rollback.

### 3.4 Permission pada tag endpoint

`TagsController`, `ArticleTagsController`, dan `SnippetTagsController` menggunakan JWT + TenantContextGuard tetapi tidak menggunakan PermissionGuard. Dokumentasi API tidak mengklaim permission khusus untuk endpoint tersebut, sehingga tidak ada mismatch dokumentasi. Namun authorization model ini perlu diputuskan secara eksplisit pada security audit berikutnya.

## 4. Verifikasi API

Controller yang diperiksa konsisten dengan dokumentasi untuk Authentication, Workspace/member/invitation/roles, Project/project members, Task/assignees, Knowledge/article tags/generic tags, Snippet/snippet tags, Document, Billing catalog/discount/subscription/invoice/payment/checkout, pre-tenant checkout session, dan Platform Admin monitoring.

## 5. Database verification

`backend-personal-app/src/prisma/contract.prisma` mendukung dokumentasi utama untuk User, Tenant/member/invitation, custom role/permission, Project/ProjectMember, Task/TaskAssignee, Knowledge/Tag, CodeSnippet/SnippetTag, Document, Subscription catalog, Discount, Subscription, Invoice, Payment, BillingCheckoutSession, dan AuditLog.

`BillingCheckoutSession` dan `AuditLog` memang menggunakan identifier biasa pada beberapa field tanpa Prisma relation declaration seperti yang dijelaskan pada dokumen database.

## 6. Prioritas tindak lanjut

1. Perbaiki usage `WORKSPACE_MEMBER` pada BillingFeatureService.
2. Tentukan apakah pending invitation ikut dihitung sebagai `reservedUsage`.
3. Pada security audit berikutnya, putuskan apakah tag endpoint harus menggunakan PermissionGuard.
4. Setelah itu buat `15-api-frontend-backend-map.md` untuk tracing Page → Component → lib → API endpoint → Controller → Guard → Service → Prisma → DB.

## 7. Kesimpulan

Tidak ditemukan mismatch besar pada route API, model database, atau struktur modul yang diperiksa. Dokumentasi utama masih layak dijadikan referensi, dengan catatan gap member-usage dan beberapa technical note di atas.