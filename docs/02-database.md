# 02 — Database & ERD

Source schema: backend-personal-app/src/prisma/contract.prisma

## 1. Core ERD

    User 1---N Tenant (createdBy)
    User 1---N TenantMember N---1 Tenant
    Tenant 1---N TenantCustomRole 1---N TenantRolePermission
    Tenant 1---N TenantInvitation

    Tenant 1---N Project 1---N Task
    Project 1---N ProjectMember N---1 User
    Task 1---N TaskAssignee N---1 ProjectMember

    Tenant 1---N KnowledgeArticle N---N Tag
    Tenant 1---N CodeSnippet N---N Tag
    Tenant 1---N Document

    SubscriptionPackage 1---N SubscriptionPackagePrice
    SubscriptionPackage 1---N SubscriptionPackageFeature N---1 SubscriptionFeature
    Discount 1---N DiscountPackage N---1 SubscriptionPackage

    Tenant 1---N TenantSubscription N---1 SubscriptionPackage
    TenantSubscription 1---N SubscriptionInvoice
    SubscriptionInvoice 1---N Payment
    Discount 1---N DiscountUsage
    SubscriptionInvoice 1---N InvoiceDiscount N---1 Discount

    User 1---N AuditLog
    Tenant 1---N AuditLog
    User 1---N BillingCheckoutSession

## 2. Tabel identity/workspace

### User
PK: id. Unique: username, email. Menyimpan identity, credential hash, profile dan flag Platform Admin.

### Tenant
PK: id. createdBy -> User. Workspace boundary utama.

### TenantMember
PK: id. FK tenantId -> Tenant, userId -> User, roleId -> TenantCustomRole. Unique tenantId + userId.

### TenantCustomRole
PK: id. FK tenantId -> Tenant. Unique tenantId + name.

### TenantRolePermission
PK: id. FK roleId -> TenantCustomRole. Unique roleId + module.

### TenantInvitation
PK: id. FK tenantId -> Tenant, invitedBy -> User, roleId -> TenantCustomRole. token unique.

## 3. Project/task

### Project
PK: id. FK createdBy -> User dan tenantId -> Tenant. Menjadi container task.

### ProjectMember
PK: id. FK projectId -> Project dan userId -> User. Unique projectId + userId.

### Task
PK: id. FK projectId -> Project, tenantId -> Tenant, createdBy -> User. Index tenantId dan tenantId+projectId.

### TaskAssignee
PK: id. FK composite taskId+projectId -> Task dan projectId+userId -> ProjectMember. Unique taskId + userId.

## 4. Knowledge/snippet/document

### KnowledgeArticle
PK: id. FK createdBy -> User dan tenantId -> Tenant. Unique tenantId + slug.

### Tag
PK: id. FK tenantId -> Tenant. Unique tenantId + name.

### KnowledgeArticleTag
PK: id. FK articleId -> KnowledgeArticle dan tagId -> Tag. Unique articleId + tagId.

### CodeSnippet
PK: id. FK createdBy -> User dan tenantId -> Tenant.

### SnippetTag
PK: id. FK snippetId -> CodeSnippet dan tagId -> Tag. Unique snippetId + tagId.

### Document
PK: id. FK createdBy -> User dan tenantId -> Tenant. Menyimpan metadata dan filePath.

## 5. Billing catalog

### SubscriptionPackage
Master plan. PK id, unique code.

### SubscriptionPackagePrice
Versioned price. FK packageId. Unique packageId + billingPeriod + version.

### SubscriptionFeature
Master feature. Unique code. valueType BOOLEAN/LIMIT.

### SubscriptionPackageFeature
Mapping package-feature. FK packageId dan featureId. Unique packageId + featureId. limitValue digunakan jika feature bertipe LIMIT.

## 6. Discount

### Discount
Master promo. Menyimpan type, percentage/value, min/max, duration, usage, validity dan active status.

### DiscountPackage
Mapping discount ke package. Unique discountId + packageId.

### DiscountUsage
Histori penggunaan discount dengan tenant, optional subscription dan invoice.

### InvoiceDiscount
Snapshot discount yang diterapkan pada invoice.

## 7. Subscription/invoice/payment

### TenantSubscription
FK tenantId, packageId dan packagePriceId. Menyimpan lifecycle subscription dan current billing period.

### SubscriptionInvoice
FK tenantId, subscriptionId dan packagePriceId. Menyimpan snapshot package/harga dan nilai tagihan.

### Payment
FK tenantId, subscriptionId, invoiceId. Menyimpan provider, status, amount, checkout URL dan timestamps.

### BillingCheckoutSession
Pre-tenant checkout state. Menghubungkan user dengan package dan package price sebelum provisioning tenant.

## 8. AuditLog

Kolom:

| Column | Fungsi |
|---|---|
| id | primary key |
| userId | actor |
| tenantId | workspace context |
| action | event code |
| entity | entity type |
| entityId | entity identifier |
| description | human readable description |
| metadata | JSON serialized context |
| ipAddress | source IP |
| userAgent | client user-agent |
| createdAt | event timestamp |

Index: createdAt; userId+createdAt; tenantId+createdAt; entity+entityId; action+createdAt.

## 9. Enum

- ProjectStatus: PLANNED, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED
- TenantRole: OWNER, ADMIN, MEMBER
- PermissionModule: DASHBOARD, PROJECTS, TASKS, KNOWLEDGE, CODE_SNIPPETS, DOCUMENTS, PROJECT_MEMBERS, WORKSPACE_MEMBERS, WORKSPACE_SETTINGS
- ProjectRole: OWNER, ADMIN, DEVELOPER, REVIEWER, VIEWER
- TaskStatus: TODO, IN_PROGRESS, REVIEW, DONE, CANCELLED
- TaskPriority: LOW, MEDIUM, HIGH, URGENT
- SubscriptionBillingPeriod: MONTHLY, YEARLY
- SubscriptionFeatureValueType: BOOLEAN, LIMIT
- DiscountType: PERCENTAGE, FIXED_AMOUNT
- DiscountDuration: ONCE, RECURRING_CYCLES, FOREVER
- SubscriptionStatus: PENDING, TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED
- PaymentStatus: PENDING, SUCCEEDED, FAILED, EXPIRED, CANCELLED
- PaymentProviderType: SANDBOX, MIDTRANS, XENDIT
- BillingCheckoutSessionStatus: PENDING, SUCCEEDED, FAILED, EXPIRED, CANCELLED

## 10. Relational rules

TenantId adalah isolation boundary untuk resource workspace. Unique constraints mencegah duplikasi membership, slug/tag dan mapping catalog. Invoice menyimpan snapshot nilai komersial agar histori tidak berubah ketika catalog berubah.