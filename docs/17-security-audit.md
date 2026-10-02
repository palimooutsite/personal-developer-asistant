# 17 — Security Audit

## 1. Scope

Audit source branch `dev/project-members-api` untuk authentication, tenant context, permission guard, service-level authorization, tenant isolation, dan billing-limit enforcement.

Severity: HIGH = dapat melewati kontrol bisnis/otorisasi penting; MEDIUM = authorization terlalu luas atau boundary tidak konsisten; LOW = hardening/defense-in-depth.

## 2. Executive Summary

Resource utama Project, Task, Knowledge, Snippet, dan Document menggunakan pola `JwtAuthGuard → TenantContextGuard → PermissionGuard → Service` pada controller. TenantContextGuard juga memastikan user merupakan member tenant berdasarkan `X-Tenant-Id`. Namun ditemukan dua gap material dan beberapa gap authorization consistency.

## 3. Finding SEC-01 — Document upload melewati billing limit

Severity: HIGH
Status: CONFIRMED

Evidence: `DocumentsService.create()` menghitung jumlah Document tenant dan memanggil `billingFeatureService.assertWithinLimit(..., 'DOCUMENT', currentUsage)`. Namun `DocumentsService.upload()` langsung membuat record `Document` tanpa memanggil `assertWithinLimit()`.

Impact: jika paket memiliki limit DOCUMENT, user yang mempunyai permission DOCUMENTS/CREATE dapat mengunggah document melebihi limit melalui endpoint `/documents/upload`, walaupun endpoint create metadata biasa menghormati limit.

Recommendation: panggil `assertWithinLimit(tenantId, userId, 'DOCUMENT', currentUsage)` pada upload sebelum membuat record. Perlu diperhatikan bahwa file sudah ditulis ke filesystem oleh Multer sebelum service berjalan, sehingga bila limit ditolak controller/service harus menghapus file upload agar tidak meninggalkan orphan file. Alternatif lebih kuat adalah melakukan cleanup pada exception setelah interceptor atau memindahkan upload handling ke flow yang dapat melakukan quota validation sebelum persistence file.

## 4. Finding SEC-02 — Tag CRUD tidak menggunakan PermissionGuard

Severity: MEDIUM
Status: CONFIRMED

Evidence: `TagsController` hanya menggunakan `JwtAuthGuard, TenantContextGuard`; endpoint POST/GET/PATCH/DELETE tidak mempunyai `RequirePermission`. `TagsService` juga tidak melakukan role/permission check.

Impact: setiap member tenant yang berhasil melewati TenantContextGuard dapat membuat, mengubah, atau menghapus Tag tenant. Tag merupakan shared resource yang digunakan oleh KnowledgeArticleTag dan SnippetTag, sehingga perubahan/delete dapat berdampak ke user lain dalam tenant.

Recommendation: tentukan authorization policy resmi untuk Tag. Opsi paling konsisten dengan architecture saat ini adalah mengaitkan CRUD tag dengan permission `KNOWLEDGE` atau `CODE_SNIPPETS`, atau menambahkan module permission khusus `TAGS`. Pilihan harus diputuskan sebelum patch karena akan menentukan UX dan role matrix.

## 5. Finding SEC-03 — Article/Snippet tag mutation memakai ownership, bukan permission

Severity: MEDIUM
Status: CONFIRMED

Evidence: `ArticleTagsService.requireArticle()` mencari article dengan `id + tenantId + createdBy=userId`; `SnippetTagsService.requireSnippet()` menggunakan `id + tenantId + createdBy=userId`. Controller tag relation tidak memakai PermissionGuard.

Impact: member dengan permission UPDATE pada Knowledge/Snippet tidak otomatis dapat memasang/melepas tag pada resource milik member lain. Ini bukan cross-tenant escalation, tetapi authorization model tidak konsisten dengan resource utama.

Recommendation: setelah policy tag ditetapkan, relation mutation sebaiknya mengikuti permission resource (`KNOWLEDGE UPDATE` / `CODE_SNIPPETS UPDATE`) daripada ownership-only, kecuali ownership restriction memang merupakan business rule yang disengaja.

## 6. Finding SEC-04 — Workspace member listing tidak menggunakan permission khusus

Severity: LOW/MEDIUM
Status: CONFIRMED

Evidence: `GET /tenants/:id/members` masuk melalui JWT pada controller; service `findMembers()` hanya memanggil `getMembership()`. Tidak ada `PermissionGuard` atau `hasWorkspacePermission()` untuk READ.

Impact: semua member tenant dapat melihat daftar member workspace. Karena data response mencakup username, email, name, role, dan roleId, ini merupakan information-access decision yang perlu dibuat eksplisit.

Recommendation: tentukan apakah `WORKSPACE_MEMBERS READ` harus diwajibkan. Permission module `WORKSPACE_MEMBERS` sudah tersedia, sehingga secara arsitektur mudah diterapkan.

## 7. Finding SEC-05 — Workspace permissions endpoint hanya membership check

Severity: LOW
Status: CONFIRMED

Evidence: `GET /tenants/:id/permissions` menggunakan TenantContextGuard dan `TenantService.getPermissions()`. Tidak ada PermissionGuard. Service mengambil permission user sendiri.

Impact: endpoint memungkinkan setiap member melihat permission efektif dirinya sendiri. Ini umumnya bukan privilege escalation, tetapi perlu dianggap sebagai intentional self-service endpoint.

Recommendation: tidak perlu diubah jika tujuan endpoint memang menampilkan effective permissions user untuk UI. Dokumentasikan sebagai self-permission endpoint.

## 8. Finding SEC-06 — Tenant update authorization berada di service

Severity: LOW / DESIGN
Status: CONFIRMED

Evidence: `PATCH /tenants/:id` tidak memakai PermissionGuard pada controller, tetapi `TenantService.update()` memeriksa `WORKSPACE_SETTINGS UPDATE`.

Impact: saat ini authorization tetap dilakukan, sehingga tidak ditemukan bypass langsung. Namun pola berbeda dengan resource controller yang memakai PermissionGuard.

Recommendation: konsolidasikan authorization di controller + service defense-in-depth, atau tetapkan service-only sebagai pola resmi untuk workspace operations. Jangan menghapus service check hanya karena menambahkan guard.

## 9. Positive Controls

- `TenantContextGuard` mengambil `X-Tenant-Id` dan memastikan user mempunyai `TenantMember` pada tenant tersebut.
- Project/Task/Knowledge/Snippet/Document controllers menggunakan PermissionGuard.
- Resource services umumnya meneruskan tenantId dari request context, bukan mempercayai tenantId dari body.
- Document read/update/delete memakai `id + createdBy + tenantId`, sehingga user tidak dapat membaca document milik user lain melalui endpoint saat ini.
- Article/Snippet tag relation memverifikasi tenant pada resource utama dan tag.

## 10. Priority Matrix

| ID | Severity | Area | Recommended action |
|---|---|---|---|
| SEC-01 | HIGH | Document quota | Patch immediately |
| SEC-02 | MEDIUM | Tag CRUD authorization | Decide policy then patch |
| SEC-03 | MEDIUM | Article/Snippet tag ownership | Align with permission policy |
| SEC-04 | LOW/MEDIUM | Member list | Decide if READ permission required |
| SEC-05 | LOW | Self permission endpoint | Document intentional behavior |
| SEC-06 | LOW/DESIGN | Tenant update | Standardize authorization pattern |

## 11. Recommended Remediation Order

1. Fix SEC-01 document upload quota and orphan-file cleanup.
2. Define Tag authorization policy.
3. Apply the chosen Tag permission model to TagsController and relation mutation.
4. Decide `WORKSPACE_MEMBERS READ` policy.
5. Standardize workspace controller/service authorization without removing service defense-in-depth.
6. Add integration tests for 401, cross-tenant 403, insufficient permission 403, quota 409, and owner/member authorization.

## 12. Important Boundary

This audit is based on source inspection. It identifies confirmed code paths and recommended controls; it is not a penetration test, dependency vulnerability scan, infrastructure review, or runtime exploit verification.