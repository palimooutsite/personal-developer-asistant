# 01 — Functional & Architecture

## 1. Fungsi dan tujuan

Personal Developer Assistant (PDA) adalah platform workspace untuk membantu developer mengelola pekerjaan dan knowledge engineering dalam satu aplikasi.

Kapabilitas saat ini:
- authentication dan profile
- multi-workspace / tenant
- member dan invitation
- role dan permission
- dashboard
- project dan project member
- task dan assignee
- knowledge base dan tag
- code snippet dan tag
- document upload/storage
- subscription dan billing
- package, feature, limit dan discount
- invoice dan payment
- sandbox checkout/payment
- Platform Admin monitoring
- audit trail

Tujuan arsitektur utamanya adalah memisahkan data antar-workspace menggunakan tenantId, sementara Platform Admin mempunyai scope lintas tenant.

## 2. Aktor

### User
Register/login, memilih workspace, mengelola project/task/knowledge/snippet/document, billing dan membership sesuai permission.

### Workspace Owner/Admin
Mengelola workspace, member, invitation, role, project member dan pengaturan sesuai permission.

### Platform Admin
User dengan isPlatformAdmin = true. Mengelola catalog billing, discount dan memonitor subscription, invoice, payment serta audit log.

## 3. Arsitektur

    User Browser
       |
       +-----------------------------+
       |                             |
       v                             v
    User Next.js                  Admin Next.js
       :3001                         :3003
       |                             |
       +-------------+---------------+
                     | /backend-api
                     v
              NestJS REST API :3002
                     |
          +----------+----------+
          |                     |
       Business             Prisma Contract
       Modules                   |
          |                       v
          +---------------- PostgreSQL

Backend modules utama: Auth, Users, Tenants, Projects, Tasks, Knowledge, Snippets, Documents, Dashboard, Billing dan Audit.

## 4. Tenant isolation

Request workspace menggunakan Authorization Bearer JWT dan X-Tenant-Id.

Flow:

    JWT -> JwtAuthGuard -> TenantContextGuard -> TenantRequest -> Service -> Database

TenantContextGuard memastikan user mempunyai membership terhadap workspace sebelum service memproses resource tenant.

## 5. Permission

Permission module:
- DASHBOARD
- PROJECTS
- TASKS
- KNOWLEDGE
- CODE_SNIPPETS
- DOCUMENTS
- PROJECT_MEMBERS
- WORKSPACE_MEMBERS
- WORKSPACE_SETTINGS

Action yang digunakan: CREATE, READ, UPDATE, DELETE.

Controller menetapkan requirement dengan RequirePermission dan PermissionGuard memvalidasinya.

## 6. Business rules

### Authentication
- username dan email unik.
- login menghasilkan JWT.
- password tidak dikembalikan.
- login success/failed dicatat sebagai audit.

### Workspace
- Tenant adalah boundary data.
- TenantMember menghubungkan user dengan workspace.
- tenantId + userId unik.
- invitation menggunakan token unik dan expiration.
- create/add/remove/accept membership menghasilkan audit event.

### Member limit
Feature WORKSPACE_MEMBER dapat mempunyai limitValue. Saat add member atau create invitation, sistem menghitung active members + pending invitations dan membandingkannya dengan limit subscription.

Jika penuh, API mengembalikan code WORKSPACE_MEMBER_LIMIT_REACHED.

### Project
Project berada dalam tenant dan dapat memiliki ProjectMember. ProjectRole: OWNER, ADMIN, DEVELOPER, REVIEWER, VIEWER.

### Task
Task berada dalam project dan tenant. Status: TODO, IN_PROGRESS, REVIEW, DONE, CANCELLED. Priority: LOW, MEDIUM, HIGH, URGENT.

### Knowledge
Article berada dalam tenant. slug unik per tenant. Article dapat memiliki tag.

### Snippet
CodeSnippet berada dalam tenant dan dapat memiliki tag.

### Document
Document menyimpan metadata file. Upload saat ini maksimal 10 MB dan menerima PDF, DOCX, TXT dan Markdown. Binary disimpan di filesystem, bukan sebagai blob database.

### Billing catalog
Package mempunyai price, feature dan limit. Feature mempunyai tipe BOOLEAN atau LIMIT. Price disimpan dalam amountMinor.

Default catalog saat ini:

| Package | Project | Task | Knowledge | Snippet | Document | Member | Monthly | Yearly |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| FREE | 3 | 10 | 50 | 50 | 20 | 2 | Rp0 | Rp0 |
| PRO | 20 | 100 | 1000 | 1000 | 500 | 10 | Rp99.000 | Rp990.000 |
| BUSINESS | 100 | 500 | 10000 | 10000 | 5000 | 50 | Rp249.000 | Rp2.490.000 |

### Discount
Tipe: PERCENTAGE dan FIXED_AMOUNT. Duration: ONCE, RECURRING_CYCLES dan FOREVER. Dapat dibatasi minimum amount, maximum discount, usage limit, start/expiry dan package.

### Subscription
Status: PENDING, TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED.

### Invoice
Invoice menyimpan snapshot package, harga, discount, tax dan final amount sehingga histori tidak bergantung pada catalog yang berubah.

### Payment
Status: PENDING, SUCCEEDED, FAILED, EXPIRED, CANCELLED. Provider enum: SANDBOX, MIDTRANS, XENDIT. Flow aktif saat ini menggunakan SANDBOX.

### Checkout session
Pre-tenant checkout membuat BillingCheckoutSession. Sandbox success dapat membuat Tenant, Subscription, Invoice dan Payment sekaligus.

### Audit
AuditLog menyimpan actor, tenant, action, entity, entityId, description, metadata, IP, user-agent dan timestamp.

Audit logging dibuat non-blocking: jika write audit gagal, error dicatat ke server log dan business operation tidak dibatalkan.

## 7. Flow utama

### Register sampai Dashboard

    Register -> User -> Login -> JWT -> Workspace Selection -> X-Tenant-Id -> Dashboard

### Project dan Task

    Workspace -> Project -> ProjectMember -> Task -> Assignee -> Status/Priority

### Billing

    Plans -> Package -> Billing Period -> Optional Discount -> Checkout Session -> Sandbox Payment -> Subscription + Invoice + Payment

### Admin

    Admin Login -> /auth/me -> isPlatformAdmin -> Admin Dashboard -> Billing/Subscription/Invoice/Payment/Audit

## 8. Audit event

Event penting saat ini:
- AUTH.LOGIN_SUCCESS
- AUTH.LOGIN_FAILED
- WORKSPACE.CREATED
- WORKSPACE.MEMBER_ADDED
- WORKSPACE.MEMBER_REMOVED
- BILLING.PACKAGE_CREATED
- BILLING.PACKAGE_UPDATED
- BILLING.FEATURE_CREATED
- BILLING.FEATURE_UPDATED
- BILLING.PRICE_CREATED
- BILLING.PRICE_UPDATED
- BILLING.DISCOUNT_CREATED
- BILLING.DISCOUNT_UPDATED
- BILLING.SUBSCRIPTION_CREATED
- BILLING.SUBSCRIPTION_CANCELLED
- BILLING.INVOICE_CREATED
- BILLING.PAYMENT_CREATED
- BILLING.PAYMENT_SUCCEEDED
- BILLING.PAYMENT_FAILED

## 9. ERD konseptual

    User
      |
      +---- Tenant ---- TenantMember ---- User
      |       |
      |       +---- Project ---- ProjectMember ---- User
      |       |       |
      |       |       +---- Task ---- TaskAssignee
      |       |
      |       +---- KnowledgeArticle ---- KnowledgeArticleTag ---- Tag
      |       +---- CodeSnippet --------- SnippetTag ------------ Tag
      |       +---- Document
      |       +---- TenantSubscription ---- SubscriptionPackage
      |                  |                    |
      |                  |                    +---- Price
      |                  |                    +---- Feature
      |                  |
      |                  +---- SubscriptionInvoice ---- Payment
      |
      +---- BillingCheckoutSession ---- Package/Price
      |
      +---- AuditLog
