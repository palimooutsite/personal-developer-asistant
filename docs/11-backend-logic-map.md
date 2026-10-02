# 11 — Backend Logic Map

Dokumen ini memetakan hubungan antar layer dan service backend Personal Developer Assistant. `06-technical-service-logic.md` menjelaskan masing-masing service; dokumen ini menjelaskan aliran dan dependency antar service.

## 1. High-Level

```text
Client Apps
   ↓
NestJS Controllers
   ↓
Guards: JWT / TenantContext / Permission / PlatformAdmin
   ↓
DTO validation
   ↓
Services
   ↓
Prisma Contract ORM
   ↓
PostgreSQL
```

File resources seperti document dan avatar juga menggunakan filesystem storage.

## 2. Normal Request Flow

```text
Client
 ↓ Authorization: Bearer JWT
 ↓ X-Tenant-Id (tenant resource)
Controller
 ↓
JwtAuthGuard
 ↓
TenantContextGuard
 ↓
PermissionGuard
 ↓
DTO
 ↓
Service
 ↓
Business validation
 ↓
Billing entitlement bila diperlukan
 ↓
Prisma Contract
 ↓
PostgreSQL
 ↓
Audit bila business event penting
```

Not every endpoint uses every guard. Public endpoints may skip authentication; Platform Admin endpoints use PlatformAdminGuard.

## 3. Identity → Tenant → Permission

```text
JWT
 ↓
User
 ↓
TenantMember
 ↓
TenantCustomRole
 ↓
TenantRolePermission
 ↓
Module + CREATE/READ/UPDATE/DELETE
 ↓
ALLOW / DENY
```

Frontend permission is UX only. Backend remains the authorization source of truth.

## 4. Tenant Isolation

TenantId is the primary workspace data boundary.

```text
Tenant
 ├─ TenantMember
 ├─ Project
 ├─ Task
 ├─ KnowledgeArticle
 ├─ CodeSnippet
 ├─ Document
 ├─ Tag
 ├─ Subscription
 ├─ Invoice
 └─ Payment
```

Resource access should validate both resource identity and active tenant context.

## 5. Project → Task

```text
Tenant
 ↓
Project
 ↓
ProjectMember
 ↓
Task
 ↓
TaskAssignee → User
```

Project creation checks PROJECT billing limit and creates ProjectMember OWNER. Task creation checks project membership, mutation role and TASK billing limit.

Project mutation roles: OWNER/ADMIN. Task mutation roles: OWNER/ADMIN/DEVELOPER.

## 6. Knowledge

```text
Tenant
 ├─ KnowledgeArticle ─ ArticleTag ─ Tag
 └─ Tag
```

Knowledge create checks tenant isolation, slug uniqueness within tenant and KNOWLEDGE entitlement.

## 7. Snippet

```text
Tenant
 ├─ CodeSnippet ─ SnippetTag ─ Tag
 └─ Tag
```

Snippet create checks tenant isolation and CODE_SNIPPET entitlement.

## 8. Document

```text
Upload
 ↓
File validation
 ↓
Tenant/user validation
 ↓
DOCUMENT entitlement
 ↓
Filesystem binary + PostgreSQL metadata
```

Read validates owner/tenant, then checks the filesystem before streaming the file. Delete removes database metadata and attempts filesystem unlink.

## 9. Billing Entitlement

```text
Package
 ↓
PackageFeature
 ↓
TenantSubscription
 ↓
BillingFeatureService
 ↓
Resource Service
```

Limited resources currently include PROJECT, TASK, KNOWLEDGE, CODE_SNIPPET, DOCUMENT and WORKSPACE_MEMBER.

Generic limit flow:

```text
currentUsage + feature limit
        ↓
   within limit?
    ├─ no → reject
    └─ yes → continue
```

Workspace member capacity additionally counts active members plus pending invitations.

## 10. Billing Catalog

```text
Package
 ├─ PackagePrice
 └─ PackageFeature
       ↓
     Feature
```

Platform Admin controls package, feature, price and package-feature configuration.

## 11. Discount

```text
Discount
 ↓
DiscountPackage
 ↓
Eligible Package
 ↓
Checkout / Invoice calculation
```

Discount supports percentage/fixed amount, duration, minimum amount, maximum discount, usage limit and validity window.

## 12. Subscription → Invoice → Payment

```text
Subscription
 ↓
Invoice PENDING
 ↓
Payment PENDING
 ├─→ SUCCEEDED → Invoice SUCCEEDED → Subscription ACTIVE
 └─→ FAILED
```

Current payment provider flow is SANDBOX.

Invoice is a historical billing snapshot; later package/price changes must not rewrite the old invoice values.

## 13. Pre-Tenant Checkout

```text
User
 ↓
Package + Price + optional Discount
 ↓
CheckoutSession
 ↓
Sandbox success
 ↓
Create Tenant
 ↓
Owner role + permissions
 ↓
TenantMember OWNER
 ↓
Subscription
 ↓
Invoice
 ↓
Payment
 ↓
CheckoutSession SUCCEEDED
```

This flow can provision workspace/billing directly, so audit coverage must exist at this flow as well as the normal TenantService flow.

## 14. Audit Cross-Cutting Flow

```text
Business Service
 ↓
AuditService.create()
 ↓
AuditLog
 ↓
Platform Admin Audit UI
```

Important events include AUTH.LOGIN_SUCCESS/FAILED, WORKSPACE.CREATED, WORKSPACE.MEMBER_ADDED/REMOVED and billing package/feature/price/discount/subscription/invoice/payment events.

Audit is business traceability; operational server logging remains a separate concern.

## 15. Service Dependency Map

```text
AuthService
 ├─ UsersService
 └─ AuditService

TenantService
 ├─ BillingFeatureService
 ├─ TenantRoleService
 └─ AuditService

ProjectsService ── BillingFeatureService
TasksService ───── BillingFeatureService
KnowledgeService ─ BillingFeatureService
SnippetsService ── BillingFeatureService
DocumentsService ─ BillingFeatureService

Billing Services ── AuditService
DashboardService ── PrismaService
```

## 16. Authorization Layers

```text
1. Authentication → siapa user?
2. Tenant context → workspace mana?
3. Permission → boleh action?
4. Resource membership/ownership → boleh resource spesifik?
5. Business rule → state bisnis valid?
6. Billing entitlement → limit/feature tersedia?
7. Persistence
8. Audit
```

## 17. Platform Admin Flow

```text
Admin Frontend
 ↓
JWT
 ↓
JwtAuthGuard
 ↓
PlatformAdminGuard
 ↓
Admin Service
 ↓
Global database query
```

Admin subscription, invoice and payment monitoring are currently read-only. Catalog and discount administration are mutation-capable through protected admin endpoints.

## 18. Error Map

| Error | Typical meaning |
|---|---|
| 401 | Authentication/JWT failure |
| 403 | Tenant, permission, project role, or platform-admin authorization failure |
| 404 | Resource not found within expected boundary |
| 409 | Duplicate or invalid business state |
| WORKSPACE_MEMBER_LIMIT_REACHED | Workspace member entitlement exhausted |

## 19. Debugging Order

```text
Browser request
 ↓
Authorization / X-Tenant-Id
 ↓
JwtAuthGuard
 ↓
TenantContextGuard
 ↓
PermissionGuard / PlatformAdminGuard
 ↓
Controller
 ↓
Service validation
 ↓
BillingFeatureService
 ↓
Prisma Contract
 ↓
PostgreSQL / filesystem
 ↓
Audit
```

## 20. New Feature Development Map

```text
Database model
 ↓
Prisma Contract
 ↓
Migration
 ↓
Service
 ↓
Controller
 ↓
Guard / Permission
 ↓
Billing feature if limited
 ↓
Audit event if business-significant
 ↓
Frontend API/page
 ↓
Tests
 ↓
Documentation
```

## 21. Architectural Mental Model

```text
Identity + Tenant + Permission
             ↓
       Billing Entitlement
             ↓
        Business Rule
             ↓
         Resources
             ↓
        Persistence
             ↓
           Audit
             ↓
      Platform Admin
```

The seven concepts above are the primary mental model when adding or changing backend functionality.