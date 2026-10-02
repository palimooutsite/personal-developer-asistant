# 13 — Repository Structure & File Map

## 1. Tujuan

Dokumen ini **hanya digunakan untuk mencari lokasi folder dan file** pada repository.

Gunakan dokumen ini ketika pertanyaannya seperti:

- "File login ada di mana?"
- "Controller billing ada di folder mana?"
- "Component ProjectForm ada di mana?"
- "Service Tenant ada di mana?"
- "Schema database ada di mana?"
- "API client frontend ada di mana?"
- "Dokumentasi troubleshooting ada di mana?"

Dokumen ini tidak menjelaskan business logic secara detail. Untuk logic gunakan dokumentasi teknis yang tercantum pada bagian terakhir.

---

# 2. Root Repository

```
personal-developer-asistant/
│
├── backend-personal-app/
├── frontend-personal-app/
├── frontend-personal-admin/
├── docs/
└── docker-compose.yml
```

## 2.1 Fungsi folder utama

| Folder | Isi |
|---|---|
| `backend-personal-app/` | NestJS backend, API, business logic, Prisma Contract |
| `frontend-personal-app/` | aplikasi user/customer |
| `frontend-personal-admin/` | aplikasi Platform Admin |
| `docs/` | seluruh dokumentasi project |
| `docker-compose.yml` | konfigurasi Docker repository |

---

# 3. Backend — `backend-personal-app/`

## 3.1 Root backend

```
backend-personal-app/
├── .agents/
├── .claude/
├── .cursor/
├── migrations/
├── migrations_backup/
├── src/
├── test/
├── nest-cli.json
├── oxlint.json
├── package.json
├── pnpm-workspace.yaml
├── prisma-8.md
├── prisma.config.ts
├── tsconfig.build.json
├── tsconfig.build.tsbuildinfo
├── tsconfig.json
└── vitest.config*.ts
```

Folder `.agents/`, `.claude/`, dan `.cursor/` berisi skill/reference tooling dan bukan business source utama.

---

# 4. Backend Source — `backend-personal-app/src/`

```
src/
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── main.ts
│
├── audit/
├── auth/
├── billing/
├── dashboard/
├── documents/
├── email/
├── health/
├── knowledge/
├── prisma/
├── projects/
├── snippets/
├── tasks/
├── tenants/
└── users/
```

---

# 5. Backend Root Application

| File | Lokasi |
|---|---|
| App Controller | `backend-personal-app/src/app.controller.ts` |
| App Controller Test | `backend-personal-app/src/app.controller.spec.ts` |
| App Module | `backend-personal-app/src/app.module.ts` |
| App Service | `backend-personal-app/src/app.service.ts` |
| Application Bootstrap | `backend-personal-app/src/main.ts` |

Jika ingin mencari **entry point backend**, mulai dari:

```
backend-personal-app/src/main.ts
```

---

# 6. Audit

```
backend-personal-app/src/audit/
├── audit.controller.ts
├── audit.module.ts
└── audit.service.ts
```

---

# 7. Authentication

```
backend-personal-app/src/auth/
├── auth.controller.ts
├── auth.module.ts
├── auth.service.ts
│
├── dto/
│   ├── login.dto.ts
│   └── register.dto.ts
│
├── guard/
│   ├── jwt-auth.guard.ts
│   └── platform-admin.guard.ts
│
├── strategies/
│   └── jwt.strategy.ts
│
└── types/
    └── auth-request.ts
```

Shortcut:

| Yang dicari | File |
|---|---|
| Login/Register API | `auth.controller.ts` |
| Login business logic | `auth.service.ts` |
| Login DTO | `dto/login.dto.ts` |
| Register DTO | `dto/register.dto.ts` |
| JWT guard | `guard/jwt-auth.guard.ts` |
| Platform Admin guard | `guard/platform-admin.guard.ts` |
| JWT strategy | `strategies/jwt.strategy.ts` |
| Auth request type | `types/auth-request.ts` |

---

# 8. Billing

```
backend-personal-app/src/billing/
├── billing.module.ts
│
├── catalog.controller.ts
├── catalog.service.ts
├── feature.controller.ts
├── feature.service.ts
├── discount.controller.ts
├── discount.service.ts
├── subscription.controller.ts
├── subscription.service.ts
├── invoice.controller.ts
├── invoice.service.ts
├── payment.controller.ts
├── payment.service.ts
├── checkout.controller.ts
├── checkout.service.ts
├── checkout-session.controller.ts
├── checkout-session.service.ts
│
├── admin-subscription.controller.ts
├── admin-subscription.service.ts
├── admin-invoice.controller.ts
├── admin-invoice.service.ts
├── admin-payment.controller.ts
├── admin-payment.service.ts
│
└── dto/
    ├── create-checkout-session.dto.ts
    ├── create-checkout.dto.ts
    ├── create-discount.dto.ts
    ├── create-feature.dto.ts
    ├── create-package.dto.ts
    ├── create-payment.dto.ts
    ├── create-price.dto.ts
    ├── create-subscription.dto.ts
    ├── preview-invoice.dto.ts
    ├── set-discount-package.dto.ts
    ├── set-package-feature.dto.ts
    ├── update-discount.dto.ts
    ├── update-feature.dto.ts
    ├── update-package.dto.ts
    └── update-price.dto.ts
```

Shortcut:

```
Package/Price
→ catalog.controller.ts
→ catalog.service.ts

Feature
→ feature.controller.ts
→ feature.service.ts

Discount
→ discount.controller.ts
→ discount.service.ts

Subscription
→ subscription.controller.ts
→ subscription.service.ts

Invoice
→ invoice.controller.ts
→ invoice.service.ts

Payment
→ payment.controller.ts
→ payment.service.ts

Checkout
→ checkout.controller.ts
→ checkout.service.ts

Pre-tenant Checkout
→ checkout-session.controller.ts
→ checkout-session.service.ts

Platform Admin Subscription
→ admin-subscription.*

Platform Admin Invoice
→ admin-invoice.*

Platform Admin Payment
→ admin-payment.*
```

---

# 9. Dashboard

```
backend-personal-app/src/dashboard/
├── dashboard.controller.ts
├── dashboard.module.ts
└── dashboard.service.ts
```

---

# 10. Documents

```
backend-personal-app/src/documents/
├── documents.controller.ts
├── documents.module.ts
├── documents.service.ts
└── dto/
    ├── create-document.dto.ts
    ├── update-document.dto.ts
    └── upload-document.dto.ts
```

---

# 11. Email

```
backend-personal-app/src/email/
├── email.module.ts
└── email.service.ts
```

---

# 12. Health

```
backend-personal-app/src/health/
├── health.controller.ts
└── health.module.ts
```

---

# 13. Knowledge

```
backend-personal-app/src/knowledge/
├── article-tags.controller.ts
├── article-tags.service.ts
├── knowledge.controller.ts
├── knowledge.module.ts
├── knowledge.service.ts
├── tags.controller.ts
├── tags.service.ts
│
└── dto/
    ├── add-article-tag.dto.ts
    ├── create-knowledge-article.dto.ts
    ├── create-tag.dto.ts
    ├── query-knowledge.dto.ts
    ├── update-knowledge-article.dto.ts
    └── update-tag.dto.ts
```

---

# 14. Prisma / Database

```
backend-personal-app/src/prisma/
├── contract.d.ts
├── contract.json
├── contract.prisma
├── db.ts
├── prisma.module.ts
└── prisma.service.ts
```

File paling penting:

```
backend-personal-app/src/prisma/contract.prisma
```

Jika mencari **model database/schema source**, mulai dari file tersebut.

---

# 15. Projects

```
backend-personal-app/src/projects/
├── projects.controller.ts
├── projects.module.ts
├── projects.service.ts
└── dto/
    ├── add-project-member.dto.ts
    ├── create-project.dto.ts
    ├── update-project-member.dto.ts
    └── update-project.dto.ts
```

---

# 16. Snippets

```
backend-personal-app/src/snippets/
├── snippet-tags.controller.ts
├── snippet-tags.service.ts
├── snippets.controller.ts
├── snippets.module.ts
├── snippets.service.ts
└── dto/
    ├── add-snippet-tag.dto.ts
    ├── create-code-snippet.dto.ts
    ├── query-snippet.dto.ts
    └── update-code-snippet.dto.ts
```

---

# 17. Tasks

```
backend-personal-app/src/tasks/
├── tasks.controller.ts
├── tasks.module.ts
├── tasks.service.ts
└── dto/
    ├── add-task-assignee.dto.ts
    ├── create-task.dto.ts
    └── update-task.dto.ts
```

---

# 18. Tenants / Workspace

```
backend-personal-app/src/tenants/
├── tenant.controller.ts
├── tenant.module.ts
├── tenant.service.ts
│
├── dto/
│   ├── accept-tenant-invitation.dto.ts
│   ├── add-tenant-member.dto.ts
│   ├── create-tenant-invitation.dto.ts
│   ├── create-tenant.dto.ts
│   ├── update-tenant-member.dto.ts
│   └── update-tenant.dto.ts
│
├── guard/
│   ├── tenant-context.guard.ts
│   └── tenant-context.guard.spec.ts
│
├── roles/
│   ├── permission.constants.ts
│   ├── permission.guard.ts
│   ├── require-permission.decorator.ts
│   ├── tenant-role.controller.ts
│   ├── tenant-role.module.ts
│   └── tenant-role.service.ts
│
└── types/
    └── tenant-request.ts
```

Jika mencari **workspace/member/role/permission**, mulai dari folder ini.

---

# 19. Users

```
backend-personal-app/src/users/
├── user.controller.ts
├── user.module.ts
└── user.service.ts
```

---

# 20. Backend Tests

```
backend-personal-app/test/
└── app.e2e-spec.ts
```

Test tambahan juga dapat berada dekat source module, contohnya:

```
backend-personal-app/src/app.controller.spec.ts
backend-personal-app/src/tenants/guard/tenant-context.guard.spec.ts
```

---

# 21. Backend Database Migration

Folder utama:

```
backend-personal-app/migrations/
```

Folder backup:

```
backend-personal-app/migrations_backup/
```

Migration/snapshot adalah artifact database dan jumlahnya dapat bertambah seiring perubahan schema.

Untuk mencari **schema source**, gunakan:

```
src/prisma/contract.prisma
```

Untuk mencari **riwayat perubahan database**, gunakan:

```
migrations/
```

Untuk migration lama yang dibackup:

```
migrations_backup/
```

---

# 22. User Frontend — `frontend-personal-app/`

```
frontend-personal-app/
├── app/
├── components/
├── lib/
├── public/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-workspace.yaml
├── postcss.config.mjs
└── tsconfig.json
```

---

# 23. User Frontend Pages — `app/`

```
frontend-personal-app/app/
├── page.tsx
├── layout.tsx
├── globals.css
├── favicon.ico
│
├── landing/
│   └── page.tsx
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx
│
├── dashboard/
│   └── page.tsx
│
├── workspace-selection/
│   └── page.tsx
├── workspace-settings/
│   └── page.tsx
├── tenants/
│   └── page.tsx
├── account-settings/
│   └── page.tsx
│
├── projects/
│   └── page.tsx
├── tasks/
│   └── page.tsx
├── knowledge/
│   └── page.tsx
├── snippets/
│   └── page.tsx
├── documents/
│   └── page.tsx
│
├── invitations/
│   └── accept/
│       └── page.tsx
│
├── billing/
│   ├── page.tsx
│   ├── plans/
│   │   └── page.tsx
│   ├── checkout/
│   │   └── page.tsx
│   ├── checkout-session/
│   │   ├── page.tsx
│   │   └── payment/
│   │       └── page.tsx
│   ├── payment/
│   │   └── [paymentId]/
│   │       └── page.tsx
│   └── subscription/
│       └── page.tsx
│
└── admin/
    ├── login/
    │   └── page.tsx
    └── billing/
        └── page.tsx
```

---

# 24. User Frontend Components

```
frontend-personal-app/components/
├── GlobalHeader.tsx
│
├── layout/
│   └── ModuleHeader.tsx
│
├── providers/
│   ├── TenantProvider.tsx
│   └── TenantSwitcher.tsx
│
├── projects/
│   ├── ProjectCard.tsx
│   ├── ProjectForm.tsx
│   ├── ProjectMembersModal.tsx
│   └── ProjectStats.tsx
│
├── tasks/
│   ├── TaskAssigneeModal.tsx
│   ├── TaskCard.tsx
│   ├── TaskForm.tsx
│   ├── TaskKanbanBoard.tsx
│   └── TaskStats.tsx
│
├── knowledge/
│   ├── KnowledgeCard.tsx
│   ├── KnowledgeForm.tsx
│   └── KnowledgeReader.tsx
│
├── snippets/
│   ├── SnippetCard.tsx
│   └── SnippetForm.tsx
│
├── documents/
│   ├── DocumentCard.tsx
│   ├── DocumentEditForm.tsx
│   └── DocumentForm.tsx
│
└── ui/
    ├── ConfirmDialog.tsx
    ├── DateField.tsx
    ├── Modal.tsx
    ├── StyledSelect.tsx
    └── Toast.tsx
```

---

# 25. User Frontend API Libraries

```
frontend-personal-app/lib/
├── account.ts
├── api.ts
├── auth.ts
├── billing.ts
├── documents.ts
├── knowledge.ts
├── projects.ts
├── snippets.ts
├── tasks.ts
├── tenant.ts
└── users.ts
```

Shortcut:

| Kebutuhan | File |
|---|---|
| HTTP/API base | `lib/api.ts` |
| Login/Register | `lib/auth.ts` |
| Workspace/Member/Role | `lib/tenant.ts` |
| Project | `lib/projects.ts` |
| Task | `lib/tasks.ts` |
| Knowledge | `lib/knowledge.ts` |
| Snippet | `lib/snippets.ts` |
| Document | `lib/documents.ts` |
| Billing | `lib/billing.ts` |
| Account | `lib/account.ts` |
| User search | `lib/users.ts` |

---

# 26. User Frontend Public Assets

```
frontend-personal-app/public/
├── file.svg
├── globe.svg
├── next.svg
├── vercel.svg
└── window.svg
```

---

# 27. Platform Admin Frontend — `frontend-personal-admin/`

```
frontend-personal-admin/
├── app/
├── components/
├── lib/
├── README.md
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

# 28. Admin Pages

```
frontend-personal-admin/app/
├── page.tsx
├── layout.tsx
├── globals.css
│
├── login/
│   └── page.tsx
│
└── admin/
    ├── layout.tsx
    ├── page.tsx
    │
    ├── billing/
    │   ├── page.tsx
    │   ├── packages/
    │   │   ├── page.tsx
    │   │   └── [id]/
    │   │       └── page.tsx
    │   ├── features/
    │   │   └── page.tsx
    │   └── discounts/
    │       ├── page.tsx
    │       └── [id]/
    │           └── page.tsx
    │
    ├── subscriptions/
    │   ├── page.tsx
    │   └── [id]/
    │       └── page.tsx
    │
    ├── invoices/
    │   ├── page.tsx
    │   └── [id]/
    │       └── page.tsx
    │
    ├── payments/
    │   ├── page.tsx
    │   └── [id]/
    │       └── page.tsx
    │
    └── audit-logs/
        ├── page.tsx
        └── [id]/
            └── page.tsx
```

---

# 29. Admin Components

```
frontend-personal-admin/components/
└── AdminShell.tsx
```

---

# 30. Admin Libraries

```
frontend-personal-admin/lib/
├── api.ts
├── auth.ts
├── billing.ts
└── audit.ts
```

Shortcut:

| Kebutuhan | File |
|---|---|
| HTTP/API | `lib/api.ts` |
| Admin auth | `lib/auth.ts` |
| Billing admin | `lib/billing.ts` |
| Audit admin | `lib/audit.ts` |

---

# 31. Documentation — `docs/`

```
docs/
├── README.md
├── 01-functional-architecture.md
├── 02-database.md
├── 03-backend-api.md
├── 04-frontend.md
├── 05-code-file-reference.md
├── 06-technical-service-logic.md
├── 07-technical-frontend-flow.md
├── 08-development-guide.md
├── 09-api-reference.md
├── 10-deployment-guide.md
├── 11-backend-logic-map.md
├── 12-troubleshooting-bug-location-guide.md
└── 13-repository-structure-file-map.md
```

## 31.1 Dokumentasi mana untuk apa?

| File | Gunakan ketika |
|---|---|
| 01 | ingin memahami fungsi/arsitektur aplikasi |
| 02 | ingin memahami database/ERD |
| 03 | ingin memahami backend API |
| 04 | ingin memahami halaman frontend |
| 05 | ingin mencari referensi file berdasarkan fungsi |
| 06 | ingin memahami service/backend logic |
| 07 | ingin memahami frontend flow |
| 08 | ingin menjalankan/mengembangkan project |
| 09 | ingin menggunakan API secara operasional |
| 10 | ingin deployment |
| 11 | ingin melihat peta logic backend |
| 12 | terjadi error/bug |
| 13 | ingin mencari **lokasi folder/file** |

---

# 32. Quick File Finder

## Authentication

```
Backend:
backend-personal-app/src/auth/

Frontend:
frontend-personal-app/app/login/page.tsx
frontend-personal-app/lib/auth.ts
```

## Workspace

```
Backend:
backend-personal-app/src/tenants/

Frontend:
frontend-personal-app/app/workspace-selection/page.tsx
frontend-personal-app/app/workspace-settings/page.tsx
frontend-personal-app/lib/tenant.ts
frontend-personal-app/components/providers/TenantProvider.tsx
```

## Project

```
Backend:
backend-personal-app/src/projects/

Frontend:
frontend-personal-app/app/projects/page.tsx
frontend-personal-app/components/projects/
frontend-personal-app/lib/projects.ts
```

## Task

```
Backend:
backend-personal-app/src/tasks/

Frontend:
frontend-personal-app/app/tasks/page.tsx
frontend-personal-app/components/tasks/
frontend-personal-app/lib/tasks.ts
```

## Knowledge

```
Backend:
backend-personal-app/src/knowledge/

Frontend:
frontend-personal-app/app/knowledge/page.tsx
frontend-personal-app/components/knowledge/
frontend-personal-app/lib/knowledge.ts
```

## Snippet

```
Backend:
backend-personal-app/src/snippets/

Frontend:
frontend-personal-app/app/snippets/page.tsx
frontend-personal-app/components/snippets/
frontend-personal-app/lib/snippets.ts
```

## Document

```
Backend:
backend-personal-app/src/documents/

Frontend:
frontend-personal-app/app/documents/page.tsx
frontend-personal-app/components/documents/
frontend-personal-app/lib/documents.ts
```

## Billing

```
Backend:
backend-personal-app/src/billing/

User:
frontend-personal-app/app/billing/
frontend-personal-app/lib/billing.ts

Admin:
frontend-personal-admin/app/admin/billing/
frontend-personal-admin/lib/billing.ts
```

## Audit

```
Backend:
backend-personal-app/src/audit/

Admin:
frontend-personal-admin/app/admin/audit-logs/
frontend-personal-admin/lib/audit.ts
```

## Database

```
Schema:
backend-personal-app/src/prisma/contract.prisma

Prisma runtime:
backend-personal-app/src/prisma/

Migration:
backend-personal-app/migrations/
```

---

# 33. Cara Mencari File

Jika mengetahui **nama fitur**:

```
Fitur
 ↓
Backend module
 ↓
Frontend page
 ↓
Component
 ↓
lib API
```

Contoh:

```
Task
 ↓
backend-personal-app/src/tasks/
 ↓
frontend-personal-app/app/tasks/page.tsx
 ↓
frontend-personal-app/components/tasks/
 ↓
frontend-personal-app/lib/tasks.ts
```

Jika mengetahui **jenis file**:

```
Controller → backend/src/**/*.controller.ts
Service    → backend/src/**/*.service.ts
Module     → backend/src/**/*.module.ts
DTO        → backend/src/**/dto/*.dto.ts
Guard      → backend/src/**/guard/*.ts
Page       → frontend/**/app/**/page.tsx
Component  → frontend/**/components/**/*.tsx
API Client → frontend/**/lib/*.ts
Schema     → backend/src/prisma/contract.prisma
```

---

# 34. Peta Cepat Repository

```
personal-developer-asistant
│
├── backend-personal-app
│   │
│   ├── src
│   │   ├── auth
│   │   ├── tenants
│   │   ├── users
│   │   ├── projects
│   │   ├── tasks
│   │   ├── knowledge
│   │   ├── snippets
│   │   ├── documents
│   │   ├── billing
│   │   ├── dashboard
│   │   ├── audit
│   │   ├── email
│   │   ├── health
│   │   └── prisma
│   │
│   └── migrations
│
├── frontend-personal-app
│   │
│   ├── app
│   │   ├── login
│   │   ├── dashboard
│   │   ├── projects
│   │   ├── tasks
│   │   ├── knowledge
│   │   ├── snippets
│   │   ├── documents
│   │   ├── billing
│   │   ├── workspace-settings
│   │   └── account-settings
│   │
│   ├── components
│   │   ├── projects
│   │   ├── tasks
│   │   ├── knowledge
│   │   ├── snippets
│   │   ├── documents
│   │   ├── providers
│   │   └── ui
│   │
│   └── lib
│
├── frontend-personal-admin
│   │
│   ├── app
│   │   └── admin
│   │       ├── billing
│   │       ├── subscriptions
│   │       ├── invoices
│   │       ├── payments
│   │       └── audit-logs
│   │
│   ├── components
│   └── lib
│
└── docs
```

---

# 35. Source of Truth Dokumen Ini

Struktur pada dokumen ini dibuat berdasarkan tree repository branch:

```
dev/project-members-api
```

File generated, dependency seperti `node_modules`, dan output build seperti `.next` tidak dicantumkan karena bukan source file yang perlu dinavigasi developer.

Folder migration dan tooling yang jumlah filenya besar diringkas pada level folder agar dokumen tetap mudah digunakan; source application dan seluruh file pada `src/`, frontend `app/`, `components/`, dan `lib/` dipetakan secara eksplisit.

Jika sebuah file baru dibuat kemudian, dokumen ini perlu diperbarui agar tetap menjadi **directory/file index** project.
