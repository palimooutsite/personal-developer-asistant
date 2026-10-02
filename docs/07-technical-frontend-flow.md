# 07 — Frontend Technical Flow

Dokumen ini menjelaskan implementasi frontend berdasarkan source branch `dev/project-members-api`.

## 1. Frontend architecture

Ada dua aplikasi Next.js:

- `frontend-personal-app` — user application, port 3001.
- `frontend-personal-admin` — Platform Admin, port 3003.

Keduanya menggunakan backend NestJS yang sama pada port 3002 melalui rewrite `/backend-api/*`.

Flow umum:

```
Page / Component
  ↓
lib/*.ts
  ↓
/backend-api/*
  ↓
Next.js rewrite
  ↓
NestJS API
```

## 2. User API client

File: `frontend-personal-app/lib/api.ts`

### apiRequest()

Fungsi ini menjadi HTTP abstraction utama.

Tugas:
- mengambil `pda_access_token` dari localStorage
- mengambil `pda_active_tenant_id`
- menambahkan `Authorization: Bearer ...`
- menambahkan `X-Tenant-Id`
- menetapkan Content-Type JSON jika body bukan FormData
- parsing JSON response
- mengubah API error menjadi `ApiError`
- jika 401, token dan active tenant dihapus lalu redirect ke `/login`

Karena itu page tidak perlu mengimplementasikan header authentication secara manual.

## 3. Authentication pages

### /register

File: `app/register/page.tsx`

State:
- username
- email
- name
- password
- passwordConfirmation
- loading
- error

Flow:

```
form submit
 ↓
password confirmation check
 ↓
lib/auth.register()
 ↓
POST /auth/register
 ↓
redirect /login
```

Query invitation/plan/billingPeriod dipertahankan ketika redirect ke login.

### /login

File: `app/login/page.tsx`

Flow:

```
submit email/password
 ↓
lib/auth.login()
 ↓
store pda_access_token
 ↓
clear active tenant
 ↓
cek plan / invitation
```

Jika ada plan → checkout-session.

Jika ada invitation → invitation acceptance.

Jika tidak:
- punya workspace → workspace-selection
- tidak punya workspace → billing/plans

API error ditampilkan pada form.

## 4. Workspace selection

File: `app/workspace-selection/page.tsx`

Saat mount:
- GET /tenants
- tampilkan loading skeleton
- tampilkan error jika gagal

Ketika workspace dipilih:

```
setActiveTenantId()
 ↓
localStorage pda_active_tenant_id
 ↓
/dashboard
```

Jika tidak ada workspace, user diarahkan ke `/billing/plans` untuk membuat workspace melalui billing flow.

## 5. Tenant library

File: `lib/tenant.ts`

Menyediakan abstraction untuk:
- list/create/update workspace
- list/add/update/remove member
- invitation create/accept
- permission lookup
- custom role CRUD
- active tenant state

Active tenant tidak disimpan di React global state pada library ini; sumber persistensinya adalah localStorage.

## 6. Dashboard

File: `app/dashboard/page.tsx`

Dashboard mengambil:
- current user
- dashboard summary
- tenant permission melalui TenantProvider

Summary berisi:
- project totals/status
- task totals/status/priority
- knowledge count
- snippet totals/language
- tag count

UI kemudian menampilkan statistic cards dan module shortcuts.

Permission dipakai untuk menentukan kemampuan user terhadap module tertentu.

## 7. TenantProvider / permission-driven UI

Tenant context menyediakan state tenant aktif dan permission.

Konsep:

```
active tenant
 ↓
GET permissions
 ↓
TenantProvider
 ↓
can(module, action)
 ↓
UI visibility / interaction
```

Frontend permission hanya untuk UX. Authorization final tetap dilakukan backend.

## 8. Billing library

File: `frontend-personal-app/lib/billing.ts`

Library membagi billing menjadi:

### Catalog

- getBillingPackages()
- getBillingPackage()
- getBillingPackageFeatures()

Dipakai untuk menampilkan plan dan feature.

### Subscription

- getCurrentSubscription()
- getBillingUsage()

Dipakai pada subscription/billing pages.

### Tenant checkout

- createBillingCheckout()
- sandboxSucceedPayment()

Ini merupakan flow checkout terhadap tenant yang sudah ada.

### Pre-tenant checkout

- createBillingCheckoutSession()
- sandboxSucceedCheckoutSession()
- sandboxFailCheckoutSession()

Ini digunakan ketika user belum mempunyai workspace dan checkout harus sekaligus membuat workspace.

## 9. Billing pages

### /billing/plans

Tujuan:
- mengambil package catalog
- menampilkan package dan harga
- user memilih package/billing period
- meneruskan pilihan ke checkout.

### /billing/checkout

Digunakan untuk checkout workspace yang sudah ada.

Flow:

```
package
 ↓
package price
 ↓
optional discount
 ↓
POST /billing/tenants/:tenantId/checkout
 ↓
subscription + invoice + payment response
```

### /billing/checkout-session

Digunakan untuk pre-tenant checkout.

Input utama:
- package
- billing period
- workspaceName
- optional discount

Flow:

```
POST /billing/checkout-sessions
 ↓
PENDING session
 ↓
payment/sandbox
 ↓
sandbox succeed
 ↓
Tenant + Subscription + Invoice + Payment
```

### /billing/checkout-session/payment

Menjadi UI simulasi pembayaran sandbox untuk checkout session.

### /billing/subscription

Menampilkan subscription aktif/terakhir dan informasi package/price/period.

## 10. User workspace pages

Halaman berikut mengikuti pola yang sama:

```
Page
 ↓
state/filter/form
 ↓
lib/*.ts
 ↓
apiRequest()
 ↓
NestJS
 ↓
reload state
```

### Projects

CRUD project dan project members.

### Tasks

CRUD task, status/priority, dan assignee.

### Knowledge

CRUD knowledge article serta tag relationship.

### Snippets

CRUD code snippet serta tag relationship.

### Documents

Upload, metadata, file view/download, update dan delete.

### Workspace settings

Mengelola workspace, member, invitation dan custom role/permission.

### Account settings

Mengelola profile, password dan avatar.

## 11. Invitation flow

Invitation dapat membawa token dari URL.

Login/register mempertahankan token invitation.

Setelah authentication selesai:

```
invitation token
 ↓
/invitations/accept
 ↓
POST /tenants/invitations/accept
 ↓
TenantMember dibuat
 ↓
redirect ke workspace
```

## 12. Admin API client

File: `frontend-personal-admin/lib/api.ts`

Mirip user API client tetapi lebih sederhana:
- Bearer token
- JSON request
- response parsing
- ApiError

Admin client tidak menambahkan X-Tenant-Id karena halaman admin bekerja pada global platform scope.

## 13. Admin authentication

File: `frontend-personal-admin/lib/auth.ts`

Login:
- POST /auth/login
- simpan access token

Current user:
- GET /auth/me
- membaca `isPlatformAdmin`

Admin routing menggunakan flag tersebut sebagai gate UI, sementara backend tetap menggunakan PlatformAdminGuard sebagai authorization source of truth.

Logout menghapus `pda_access_token`.

## 14. AdminShell

File: `frontend-personal-admin/components/AdminShell.tsx`

Tanggung jawab:
- sidebar
- active navigation
- Billing submenu
- top header
- logout
- link ke User Application

Navigation utama:
- Dashboard
- Users
- Workspaces
- Billing
- Subscriptions
- Invoices
- Payments
- Audit Logs

Billing submenu:
- Overview
- Plans & Prices
- Features & Limits
- Discounts

## 15. Admin Billing

### /admin/billing

Entry point Billing Control Center.

Menampilkan:
- active plans
- total plans
- active prices
- shortcut ke catalog management.

### /admin/billing/packages

Mengambil package catalog dan menampilkan:
- status
- monthly/yearly price
- capabilities
- plan activation
- navigation ke detail.

### /admin/billing/packages/[id]

Mengelola:
- package metadata
- price version
- amount
- active/inactive price
- feature enabled/disabled
- LIMIT value.

Flow feature:

```
Feature master
 ↓
Package detail
 ↓
enable feature
 ↓
set limit jika LIMIT
 ↓
POST package-feature
```

### /admin/billing/features

Mengambil seluruh feature.

Membedakan:
- BOOLEAN
- LIMIT

Mendukung create feature dan activation/deactivation.

### /admin/billing/discounts

State form menyimpan code, name, type, value, minimum, max discount, duration, cycles, usage limit dan validity.

Frontend melakukan transformasi:
- Rupiah → amountMinor
- percentage → percentage
- datetime-local → ISO string

Setelah create, list direfresh.

### /admin/billing/discounts/[id]

Mengambil secara paralel:
- discount detail
- package catalog
- assigned packages

Assignment di-toggle melalui POST/DELETE package mapping.

## 16. Admin subscription/invoice/payment monitoring

Ketiga halaman menggunakan typed client pada `lib/billing.ts`.

### Subscription

- list global subscription
- search/filter
- KPI status
- detail read-only

### Invoice

- list global invoice
- status/payment status
- amount breakdown
- detail read-only

### Payment

- list global payment
- provider/status
- amount
- invoice/workspace relation
- detail read-only

Tidak ada mutation payment/subscription/invoice pada admin UI saat ini.

## 17. Admin Audit Logs

File: `lib/audit.ts`

`listAuditLogs()` membangun query string dari:
- q
- action
- entity
- tenantId
- userId

Page Audit Logs menampilkan timeline dan metadata actor/workspace.

Detail page menampilkan:
- action
- entity
- entityId
- actor
- workspace
- metadata
- IP
- user-agent
- timestamp

## 18. Loading/error pattern

Frontend menggunakan state lokal seperti:
- loading
- saving
- error
- message

Pola umum:

```
setLoading(true)
try {
  API call
  update state
} catch {
  setError(...)
} finally {
  setLoading(false)
}
```

ApiError digunakan untuk mengambil message dari backend.

## 19. Security boundary

Frontend:
- menyimpan token pada localStorage
- menyimpan active tenant pada localStorage
- menampilkan UI berdasarkan permission

Backend:
- memvalidasi JWT
- memvalidasi tenant membership
- memvalidasi permission
- memvalidasi Platform Admin
- menjalankan business rules

Karena itu perubahan UI tidak boleh dianggap sebagai cara bypass authorization.

## 20. Data lifecycle

User application:

```
Input
 ↓
React state
 ↓
lib function
 ↓
apiRequest
 ↓
NestJS
 ↓
response
 ↓
setState
 ↓
render
```

Admin application menggunakan lifecycle yang sama, tetapi resource billing/audit yang dipanggil mempunyai platform/global scope.

## 21. Source-of-truth rule

Untuk frontend:
- page/component = presentation + interaction
- lib/*.ts = API client/type mapping
- backend = authorization + business rules
- Prisma/database = persistence

Dokumentasi ini menggambarkan source saat ini dan harus diperbarui apabila route, API client, state flow atau authorization boundary berubah.

---

# 22. Function map — User Frontend

Bagian ini mencatat fungsi utama yang ditemukan pada source branch saat ini. Page handler mengatur orchestration dan local state; component mengatur presentation/interaction; lib mengatur komunikasi API.

## 22.1 Page functions

- account-settings/page.tsx — AccountSettingsPage, handleProfileSubmit, handleAvatar, handleRemoveAvatar, handlePasswordSubmit, initials: profile, avatar, password dan display initials.
- billing/page.tsx — BillingPage, money, limit, priceFor, statusLabel: ringkasan billing dan formatter.
- billing/plans/page.tsx — BillingPlansPage, choosePackage, selectedPrice, money: catalog plan dan pemilihan price.
- billing/checkout/page.tsx — CheckoutPage, CheckoutContent, submit, money: checkout workspace existing.
- billing/checkout-session/page.tsx — CheckoutSessionPage, CheckoutSessionContent, submit, money: pre-tenant checkout.
- billing/checkout-session/payment/page.tsx — CheckoutSessionPaymentPage, CheckoutSessionPaymentContent, succeed: simulasi pembayaran sandbox.
- billing/payment/[paymentId]/page.tsx — PaymentPage, succeed: detail payment dan sandbox success.
- billing/subscription/page.tsx — SubscriptionPage, money: subscription aktif/terakhir.
- dashboard/page.tsx — HomePage, handleLogout: dashboard summary dan logout.
- documents/page.tsx — DocumentsPage, loadDocuments, startCreate, startEdit, saveEdit, handleUpload, handleOpen, handleDelete, confirmDelete: lifecycle document.
- invitations/accept/page.tsx — AcceptInvitationPage: acceptance invitation.
- knowledge/page.tsx — KnowledgePage, resetForm, openCreate, openEdit, handleSubmit, openReader, handleDelete, confirmDelete, toggleTag: CRUD, reader dan tag.
- projects/page.tsx — ProjectsPage, loadProjects, resetForm, closeForm, openCreateForm, startEdit, openMembers, closeMembers, handleAddMembers, handleMemberRoleChange, handleRemoveMember, confirmRemoveMember, handleSubmit, handleDelete, confirmDeleteProject: CRUD project dan members.
- snippets/page.tsx — SnippetsPage, startCreate, startEdit, handleSave, handleDelete, confirmDelete, toggleTag: CRUD snippet dan tag.
- tasks/page.tsx — TasksContent, resetForm, openCreate, openEdit, closeForm, handleSubmit, handleKanbanStatusChange, handleDelete, confirmDeleteTask, openAssignees, closeAssignees, handleAddAssignee, handleRemoveAssignee, confirmRemoveAssignee, TasksPage, TasksPageWithSearchParams: CRUD task, Kanban dan assignee.
- tenants/page.tsx — TenantsPage: entry tenant management.
- workspace-selection/page.tsx — WorkspaceSelectionPage, loadTenants, chooseTenant: memilih active workspace.
- workspace-settings/page.tsx — WorkspaceSettingsPage, loadMembers, loadRoles, saveWorkspace, inviteMember, changeRole, confirmRemoveMember, openCreateRole, openEditRole, togglePermission, setFullAccess, saveRole, confirmDeleteRole: workspace, member, invitation, role dan permission.
- login/page.tsx — LoginPage, handleSubmit: login dan post-login routing.
- register/page.tsx — RegisterPage, handleSubmit: registrasi dan validasi password.
- app/page.tsx — LandingPage, selectedPrice: entry route.
- landing/page.tsx — LandingPage, monthlyPrice: landing dan pricing display.

## 22.2 Reusable component functions

- GlobalHeader.tsx — GlobalHeader, handleLogout: header dan logout.
- providers/TenantProvider.tsx — TenantProvider, useTenant, isPublicPath, isPreTenantPath, isPlatformPath: active tenant, permission context dan routing boundary.
- providers/TenantSwitcher.tsx — TenantSwitcher: mengganti workspace.
- layout/ModuleHeader.tsx — ModuleHeader: header standar module.
- projects/ProjectCard.tsx — ProjectCard, statusIcon: card project/status.
- projects/ProjectForm.tsx — ProjectForm: create/update project.
- projects/ProjectMembersModal.tsx — ProjectMembersModal, toggleUser, addMembers: selection dan member project.
- projects/ProjectStats.tsx — ProjectStats: statistik project.
- tasks/TaskCard.tsx — TaskCard, formatDate, isOverdue: card/date/overdue.
- tasks/TaskForm.tsx — TaskForm: create/update task.
- tasks/TaskKanbanBoard.tsx — TaskKanbanBoard, date, overdue: Kanban/status.
- tasks/TaskAssigneeModal.tsx — TaskAssigneeModal: assignee task.
- tasks/TaskStats.tsx — TaskStats: statistik task.
- knowledge/KnowledgeCard.tsx — KnowledgeCard: preview knowledge.
- knowledge/KnowledgeForm.tsx — KnowledgeForm: create/update knowledge.
- knowledge/KnowledgeReader.tsx — KnowledgeReader: membaca detail knowledge.
- snippets/SnippetCard.tsx — SnippetCard, copyCode: preview dan copy code.
- snippets/SnippetForm.tsx — SnippetForm, handleSubmit: create/update snippet.
- documents/DocumentCard.tsx — DocumentCard, copyPath, formatSize: preview file.
- documents/DocumentForm.tsx — DocumentForm, handleSubmit, formatSize: upload.
- documents/DocumentEditForm.tsx — DocumentEditForm, handleSubmit: update metadata.
- ui/ConfirmDialog.tsx — ConfirmDialog, onKeyDown: destructive-action confirmation.
- ui/DateField.tsx — DateField, toInputDate, parseDate, formatDate, addDays, close, offset, prevMonth, nextMonth, choose: date picker.
- ui/Modal.tsx — Modal, handleKeyDown: generic modal.
- ui/StyledSelect.tsx — StyledSelect, close: custom dropdown.
- ui/Toast.tsx — Toast: feedback message.

# 23. Function map — User frontend libraries

- lib/api.ts — isPublicPath, apiRequest: HTTP abstraction, Bearer token, X-Tenant-Id, JSON/FormData, parsing response dan 401 handling.
- lib/auth.ts — register, login, logout, getCurrentUser, isAuthenticated: authentication lifecycle.
- lib/tenant.ts — getTenants, createTenant, updateTenant, getTenantMembers, addTenantMember, updateTenantMemberRole, removeTenantMember, getActiveTenantId, setActiveTenantId, clearActiveTenantId, createTenantInvitation, acceptTenantInvitation, getTenantPermissions, getTenantRoles, createTenantRole, updateTenantRole, deleteTenantRole: tenant/member/invitation/role/permission.
- lib/projects.ts — getProjects, getProject, getProjectMembers, addProjectMember, updateProjectMember, removeProjectMember, createProject, updateProject, deleteProject, addProjectMembers: project CRUD dan members.
- lib/tasks.ts — getTasks, getAllTasks, createTask, updateTask, deleteTask, getTaskAssignees, addTaskAssignee, removeTaskAssignee: task CRUD dan assignee.
- lib/knowledge.ts — getKnowledge, createKnowledge, updateKnowledge, deleteKnowledge, getTags, getArticleTags, addArticleTag, removeArticleTag: knowledge dan tags.
- lib/snippets.ts — getSnippets, createSnippet, updateSnippet, deleteSnippet, getTags, getSnippetTags, addSnippetTag, removeSnippetTag: snippets dan tags.
- lib/documents.ts — getDocuments, uploadDocument, getDocumentFileUrl, openDocumentFile, updateDocument, deleteDocument: document/file lifecycle.
- lib/account.ts — updateProfile, changePassword, uploadAvatar, removeAvatar: account lifecycle.
- lib/users.ts — searchUsers: user lookup untuk member/assignee.
- lib/billing.ts — getBillingPackages, getBillingPackage, getBillingPackageFeatures, getCurrentSubscription, getBillingUsage, createBillingCheckout, sandboxSucceedPayment, createBillingCheckoutSession, sandboxSucceedCheckoutSession, sandboxFailCheckoutSession: catalog, subscription, usage dan checkout.

# 24. Function map — Platform Admin

## 24.1 Admin pages
- app/page.tsx — HomePage: admin gate/redirect.
- app/login/page.tsx — AdminLoginPage, handleSubmit: admin login.
- app/admin/layout.tsx — AdminLayout: admin route boundary.
- app/admin/page.tsx — AdminDashboardPage: KPI/dashboard.
- app/admin/billing/page.tsx — AdminBillingPage: Billing Control Center.
- billing/packages/page.tsx — PackagesPage, load, run, rupiah: package list, sync defaults, activation/navigation.
- billing/packages/[id]/page.tsx — PackageDetailPage, load, save, PriceSection, toggle, create, FeatureRow: metadata, price dan package-feature.
- billing/features/page.tsx — FeaturesPage, load, add: feature master.
- billing/discounts/page.tsx — DiscountsPage, load, create, toggle, money, set: discount CRUD/activation.
- billing/discounts/[id]/page.tsx — DiscountDetailPage, load, togglePackage, toggleActive, has: package assignment dan activation.
- subscriptions/page.tsx — AdminSubscriptionsPage, money, date: monitoring global subscription.
- subscriptions/[id]/page.tsx — AdminSubscriptionDetail, money, date: detail read-only.
- invoices/page.tsx — AdminInvoicesPage, money, date: monitoring invoice.
- invoices/[id]/page.tsx — AdminInvoiceDetail, money, date: detail invoice.
- payments/page.tsx — PaymentsPage, money, dt, badge: monitoring payment.
- payments/[id]/page.tsx — PaymentDetail, money, dt: detail payment.
- audit-logs/page.tsx — AuditLogsPage, load, dt, actionLabel, actionTone: filter/timeline audit.
- audit-logs/[id]/page.tsx — AuditLogDetail, dt: detail audit.

## 24.2 Admin component dan library
- components/AdminShell.tsx — AdminShell: sidebar, navigation, billing submenu, header, logout.
- lib/api.ts — apiRequest: HTTP abstraction admin.
- lib/auth.ts — login, getCurrentUser, logout: admin authentication.
- lib/billing.ts — listPackages, getBillingPackageFeatures, createPackage, updatePackage, listFeatures, createFeature, updateFeature, addPrice, updatePrice, setPackageFeature, listDiscounts, getDiscount, createDiscount, updateDiscount, getDiscountPackages, setDiscountPackage, seedCatalog, listAdminSubscriptions, getAdminSubscription, listAdminInvoices, getAdminInvoice, listAdminPayments, getAdminPayment: catalog, discount dan monitoring billing.
- lib/audit.ts — listAuditLogs, getAuditLog: audit list/detail.

# 25. Peta logic frontend

## 25.1 End-to-end

Browser → App Router Page → Component/Provider → Page Handler → lib/*.ts → apiRequest() → /backend-api/* → Next.js rewrite → NestJS → Guard/Permission → Service/Business Rule → PostgreSQL → response → lib result → setState → render.

## 25.2 Active tenant

Login → GET /tenants → jika 0 workspace: billing/plans; jika 1: setActiveTenantId; jika banyak: workspace-selection → localStorage pda_active_tenant_id → TenantProvider → permission lookup → dashboard.

## 25.3 Permission-driven UI

Active tenant → TenantProvider → role/permissions → can(module, action) → show/hide atau enable/disable UI. Ini hanya UX gate; authorization final tetap backend.

## 25.4 CRUD

Page mount → load/get function → lib API → backend → setItems → render. Create/Edit memakai form handler → lib create/update → reload state. Delete memakai handler → ConfirmDialog → lib delete → reload state.

## 25.5 Projects

ProjectsPage → loadProjects → ProjectStats/ProjectCard → ProjectForm untuk create/update → ProjectMembersModal untuk search/select/add/change/remove member → lib/projects.ts → backend.

## 25.6 Tasks

TasksPage → getTasks → TaskStats + TaskCard/TaskKanbanBoard → TaskForm → TaskAssigneeModal → lib/tasks.ts → backend.

## 25.7 Knowledge/Snippets

Page → get records → Card → Form → CRUD + tag selection → ConfirmDialog/Reader → lib knowledge/snippets → backend.

## 25.8 Documents

DocumentsPage → loadDocuments → DocumentForm/upload → DocumentCard/open → DocumentEditForm/update → ConfirmDialog/delete → lib/documents.ts → backend/storage.

## 25.9 User billing

Plans → getBillingPackages → choosePackage → selected price → existing tenant ? checkout : checkout-session → payment/sandbox → subscription/invoice/payment → UI refresh.

## 25.10 Admin

Admin login → POST /auth/login → token → GET /auth/me → isPlatformAdmin ? /admin : /login → AdminLayout → AdminShell → Billing/Subscription/Invoice/Payment/Audit pages → admin lib → platform-scoped backend.

# 26. Frontend dependency map

User:
RootLayout → GlobalHeader/TenantProvider → Pages → Components → lib/*.ts → apiRequest → Backend.

Admin:
AdminLayout → AdminShell → Admin Pages → admin lib/*.ts → apiRequest → Platform Admin Backend.

# 27. Pembagian tanggung jawab

| Layer | Tanggung jawab |
|---|---|
| Page | orchestration, local state, event handler |
| Component | presentation dan reusable interaction |
| Provider | shared client context dan routing boundary |
| lib/*.ts | API client dan request/response mapping |
| apiRequest | HTTP/auth/error normalization |
| Backend | authorization, validation dan business rule |
| Database | persistence/integrity |

# 28. Debugging flow

Jika tombol/fitur bermasalah, telusuri berurutan: route/page → handler → component event → lib function → apiRequest → browser Network → Next rewrite → NestJS controller/service → database.

Jika UI terlihat benar tetapi data tidak berubah, jangan langsung mengubah component. Pastikan request, tenant header, endpoint, response dan backend business rule benar.

# 29. Mental model

ROUTE → PAGE → COMPONENT → EVENT HANDLER → LIBRARY FUNCTION → API REQUEST → AUTH/TENANT CONTEXT → BACKEND → RESPONSE → STATE UPDATE → RENDER.

Dokumen ini sekarang menjadi referensi untuk tiga pertanyaan: page ini melakukan apa, fungsi/component apa yang menangani interaksi, dan bagaimana data bergerak dari UI sampai backend.