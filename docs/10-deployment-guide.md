# 10 — Deployment Guide

## 1. Status dokumen

Dokumen ini membedakan:
- **Current** — fakta yang dapat diverifikasi dari repository.
- **Recommended** — rancangan deployment production yang disarankan, tetapi belum berarti sudah diterapkan.

Repository saat ini mempunyai tiga application package:

| Application | Port development | Start command |
|---|---:|---|
| Backend | 3002 | `pnpm start:prod` |
| User Frontend | 3001 | `pnpm start` |
| Admin Frontend | 3003 | `pnpm start` |

Ketiga package menggunakan pnpm 11.24.0. Backend menggunakan NestJS dan frontend menggunakan Next.js 16.3.5.

## 2. Recommended production topology

Rancangan deployment yang konsisten dengan pemisahan application:

```
                         Internet
                            |
                         HTTPS
                            |
                         Nginx
                  _________|_________
                 /         |         \
                /          |          \
        app.example.com  admin...   api...
             |             |          |
          Next.js        Next.js    NestJS
             |             |          |
             |_____________|          |
                         PostgreSQL
```

Recommended domains:

```
app.example.com
admin.example.com
api.example.com
```

- User application → app
- Platform Admin → admin
- Backend API → api

Domain aktual belum ditentukan dalam repository.

## 3. Reverse proxy responsibility

Nginx/edge proxy direkomendasikan menangani:

- TLS termination
- HTTP → HTTPS redirect
- routing berdasarkan hostname
- forwarding request ke application
- connection timeout
- request size limit
- security headers

Contoh konseptual:

```
app.example.com
    ↓
localhost:3001

admin.example.com
    ↓
localhost:3003

api.example.com
    ↓
localhost:3002
```

Port tersebut adalah port application yang tersedia pada scripts repository; production binding dapat berbeda.

## 4. Backend deployment

Current backend production command:

```
cd backend-personal-app
pnpm install
pnpm build
pnpm start:prod
```

`start:prod` menjalankan:

```
node dist/main
```

### Recommended process

Gunakan process manager atau container orchestration untuk:
- restart otomatis
- log management
- graceful restart
- health monitoring

Repository saat ini tidak mendefinisikan Dockerfile/Compose pada path root/application yang diperiksa, sehingga Docker deployment belum dianggap current implementation.

## 5. User frontend deployment

Current scripts:

```
cd frontend-personal-app
pnpm install
pnpm build
pnpm start
```

Port default production script adalah 3001.

Next.js application sebaiknya dijalankan sebagai long-running process di belakang reverse proxy.

## 6. Admin frontend deployment

Current scripts:

```
cd frontend-personal-admin
pnpm install
pnpm build
pnpm start
```

Port default production script adalah 3003.

Admin frontend sebaiknya berada pada hostname terpisah dan hanya menggunakan backend Platform Admin API.

## 7. Environment variables

Backend environment harus dipisahkan antara development dan production.

Minimal category yang digunakan aplikasi:
- database connection
- JWT/authentication secret/configuration
- frontend/application URL
- email provider configuration jika email delivery digunakan
- upload/storage configuration jika ditambahkan

Nilai secret tidak boleh dimasukkan ke Git.

Frontend environment harus berisi hanya value yang memang aman diekspos ke browser. Secret backend/provider tidak boleh diletakkan pada frontend.

## 8. PostgreSQL

PostgreSQL merupakan persistence layer utama.

Production recommendation:

```
Application
    ↓
Private network
    ↓
PostgreSQL
```

Database sebaiknya:
- tidak diekspos langsung ke internet
- menggunakan strong credential
- mempunyai backup
- mempunyai monitoring disk/connection
- mempunyai retention policy
- mempunyai recovery procedure

Port PostgreSQL production tidak perlu sama dengan development.

## 9. Database migration deployment

Urutan aman:

```
Backup
 ↓
Deploy compatible application/schema
 ↓
Run repository migration/update workflow
 ↓
Verify schema
 ↓
Start application
 ↓
Smoke test
```

Jangan mengubah production database secara manual jika perubahan tersebut seharusnya berasal dari Prisma Contract/migration workflow.

Perubahan pada:

```
backend-personal-app/src/prisma/contract.prisma
```

harus diperlakukan sebagai perubahan schema source dan diikuti workflow contract/migration repository.

## 10. Prisma Contract production rule

Repository menggunakan Prisma Contract API.

Sebelum deployment schema change:

1. review `contract.prisma`
2. emit contract jika diperlukan
3. generate/update migration sesuai workflow repository
4. review migration
5. backup database
6. apply database change
7. build backend
8. smoke test

Jangan menggunakan pola Prisma Client lama tanpa memastikan API generated project.

## 11. File storage

Current implementation menyimpan:
- avatar pada `uploads/avatars`
- document files pada `storage/documents`

Ini berarti filesystem application merupakan bagian dari persistence untuk file.

### Production requirement

Jika menggunakan satu server:
- directory harus persistent
- backup harus mencakup file

Jika menggunakan multiple application instances:
- local filesystem tidak cukup sebagai shared storage.

Recommended future architecture:

```
Next/Nest
   ↓
Object Storage
   ↓
S3-compatible storage
```

Tetapi object storage belum merupakan current implementation.

## 12. HTTPS

Production wajib menggunakan HTTPS untuk:
- login
- JWT transmission
- admin access
- billing
- document access

Recommended:

```
Client
 ↓ HTTPS
Nginx / Load Balancer
 ↓ HTTP/private network
Application
```

Jika application dan proxy berada pada host berbeda, private network/VPC disarankan.

## 13. Security boundary

### Public

User frontend:
```
app.example.com
```

### Restricted

Admin frontend:
```
admin.example.com
```

Backend authorization:
- JwtAuthGuard
- TenantContextGuard
- PermissionGuard
- PlatformAdminGuard

Reverse proxy bukan pengganti authorization backend.

## 14. Admin security

Admin frontend hanya UI boundary.

Backend tetap memvalidasi:

```
JWT
 ↓
PlatformAdminGuard
 ↓
Admin API
```

Jangan menganggap route `/admin/*` pada Next.js cukup untuk melindungi data platform.

## 15. Recommended health monitoring

Production sebaiknya memonitor:

### Backend
- process alive
- HTTP availability
- database connectivity
- error rate
- response latency

### Frontend
- process availability
- response status
- build/deployment status

### PostgreSQL
- disk usage
- connection count
- CPU/memory
- backup status
- query latency

### Storage
- disk usage
- failed uploads
- backup status

Health endpoint/monitoring endpoint khusus belum ditetapkan sebagai contract deployment pada repository ini.

## 16. Logging

Log minimum:
- startup/shutdown
- application errors
- authentication failures
- database failures
- billing errors
- file operation errors

AuditLog bukan pengganti application log.

Perbedaannya:

| Logging | Audit |
|---|---|
| debugging/operational | business activity |
| infrastructure | actor/action/entity |
| high volume | selected business events |
| server observability | admin traceability |

## 17. Backup strategy

Production backup minimum:

### Database
- full backup
- retention
- periodic restore test

### Files
- avatar
- document storage

Backup harus diuji restore-nya. Backup yang belum pernah diuji restore tidak boleh dianggap recovery plan yang tervalidasi.

## 18. Deployment checklist

### Pre-deployment

- [ ] Git branch/release sudah benar
- [ ] database backup tersedia
- [ ] schema change direview
- [ ] environment production tersedia
- [ ] secret production tersedia
- [ ] build backend berhasil
- [ ] build user frontend berhasil
- [ ] build admin frontend berhasil
- [ ] test relevan berhasil

### Deployment

- [ ] deploy backend
- [ ] apply database migration jika ada
- [ ] deploy user frontend
- [ ] deploy admin frontend
- [ ] update reverse proxy
- [ ] reload proxy
- [ ] verify HTTPS

### Smoke test

- [ ] login user
- [ ] /auth/me
- [ ] workspace selection
- [ ] dashboard
- [ ] create/update resource
- [ ] login Platform Admin
- [ ] admin dashboard
- [ ] billing catalog
- [ ] subscription monitoring
- [ ] invoice monitoring
- [ ] payment monitoring
- [ ] audit logs

## 19. Rollback strategy

Rollback application:

```
Previous build
    ↓
restore application version
    ↓
verify database compatibility
    ↓
smoke test
```

Database rollback tidak boleh dilakukan secara otomatis hanya karena application rollback.

Jika migration bersifat destructive, rollback harus mempunyai migration-specific recovery plan atau database restore strategy.

## 20. Production billing caution

Current billing flow menggunakan SANDBOX.

Sebelum production payment provider diaktifkan, perlu tambahan:
- provider credentials
- webhook verification
- idempotency
- payment reconciliation
- callback handling
- retry policy
- timeout policy
- fraud/security controls
- invoice/payment state reconciliation

Jangan menganggap endpoint sandbox sebagai production payment integration.

## 21. Recommended CI/CD

Pipeline:

```
Git push
 ↓
Install dependencies
 ↓
Lint
 ↓
Unit tests
 ↓
Build backend
 ↓
Build user frontend
 ↓
Build admin frontend
 ↓
Artifact/image
 ↓
Deploy staging
 ↓
Smoke test
 ↓
Production approval
 ↓
Deploy production
```

CI/CD pipeline belum menjadi configuration yang dapat diklaim sudah tersedia dari repository ini.

## 22. Recommended container architecture

Jika nanti project dikontainerisasi:

```
nginx
 ├── user-frontend
 ├── admin-frontend
 └── backend

postgres
```

Storage harus menggunakan persistent volume atau object storage.

Jangan menempatkan PostgreSQL pada container tanpa persistent volume untuk production.

## 23. Production configuration principle

Pisahkan:

```
Source Code
    ≠
Configuration
    ≠
Secrets
    ≠
Persistent Data
```

Contoh:
- source → Git
- configuration → environment/config
- secret → secret manager/environment secret
- database → PostgreSQL
- documents → persistent storage/object storage

## 24. Definition of deployment readiness

Project dapat dianggap siap untuk deployment production setelah:

- application build reproducible
- database migration workflow tervalidasi
- environment production tersedia
- HTTPS aktif
- backup tersedia
- file storage persistent
- authentication tested
- tenant isolation tested
- admin authorization tested
- billing production provider tested
- monitoring tersedia
- rollback procedure diuji

Dokumen ini tidak menyatakan seluruh item tersebut sudah aktif; sebagian adalah production readiness checklist.
