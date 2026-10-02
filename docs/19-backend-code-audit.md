# 19 — Backend Code Audit

## Audit scope

Repository: `palimooutsite/personal-developer-asistant`  
Branch: `dev/project-members-api`  
Backend: `backend-personal-app`

Audit approach:

1. Trace application entry points and module registration.
2. Trace Controller → Guard → Service → Prisma.
3. Identify dead/legacy code candidates.
4. Identify tenant-isolation and authorization gaps.
5. Identify race conditions and consistency risks.
6. Review tests and runtime verification coverage.
7. Do not delete code solely because it looks unused; mark it as candidate until caller/reference usage is verified.

Status legend:

- 🟢 ACTIVE — clearly part of the active runtime path.
- 🟡 SUSPICIOUS — usage or intended behavior needs confirmation.
- 🟠 LEGACY — compatibility/scaffold/migration path that may no longer be needed.
- 🔴 BUG/RISK — concrete defect or material runtime/security risk.
- ⚫ DEAD — proven unused after reference verification.

---

## Phase 1 findings

### AUD-001 — Default Hello World endpoint is scaffold/legacy candidate

- File: `src/app.controller.ts`
- Related: `src/app.service.ts`, `src/app.controller.spec.ts`, `test/app.e2e-spec.ts`
- Status: 🟠 LEGACY / SUSPICIOUS
- Evidence:
  - `AppController` exposes `GET /`.
  - `AppService.getHello()` returns `Hello World!`.
  - Both unit and e2e tests only verify this scaffold endpoint.
  - It is registered through `AppModule`.
- Impact:
  - Not a functional bug by itself.
  - Consumes test coverage around scaffold behavior instead of business-critical flows.
- Recommendation:
  - Do not delete yet.
  - Verify whether frontend/deployment/health checks use `GET /`.
  - If unused, replace it with a deliberate service status endpoint or remove it and its scaffold tests.

### AUD-002 — PrismaService is redundantly provided by feature modules

- Files:
  - `src/prisma/prisma.module.ts`
  - `src/tenants/tenant.module.ts`
  - `src/users/user.module.ts`
  - `src/projects/projects.module.ts`
  - `src/tasks/tasks.module.ts`
  - `src/knowledge/knowledge.module.ts`
  - `src/snippets/snippets.module.ts`
  - `src/documents/documents.module.ts`
  - `src/dashboard/dashboard.module.ts`
- Status: 🟡 SUSPICIOUS / ARCHITECTURE
- Evidence:
  - `PrismaModule` is `@Global()` and exports `PrismaService`.
  - Multiple feature modules also list `PrismaService` directly in `providers`.
  - `PrismaService` is only a wrapper around the module-level `db` singleton.
- Impact:
  - Unnecessary provider duplication and inconsistent dependency architecture.
  - Currently low runtime risk because the service is stateless and delegates to the same `db` module singleton.
- Recommendation:
  - Remove redundant local `PrismaService` providers after verifying module bootstrap/tests.
  - Keep `PrismaModule` as the single source of the provider.

### AUD-003 — Dashboard task query is not tenant-scoped

- File: `src/dashboard/dashboard.service.ts`
- Method: `getSummary()`
- Status: 🔴 BUG/RISK
- Evidence:
  - Project membership is queried only by `userId`.
  - Projects are subsequently filtered by `tenantId`.
  - Tasks are queried globally with no `tenantId` predicate and then filtered only by `projectIdSet`.
- Impact:
  - A user who belongs to projects across multiple tenants can cause dashboard task aggregation to include tasks from projects outside the active tenant if their project membership IDs overlap the global membership set.
  - This breaks the intended active-workspace boundary at the dashboard aggregation layer.
- Recommendation:
  - Scope project memberships by projects belonging to the active `tenantId`, or derive project IDs from tenant-scoped projects.
  - Query tasks with `tenantId` as well.
  - Add a cross-tenant regression test.

### AUD-004 — Health endpoint exposes database information without authentication

- File: `src/health/health.controller.ts`
- Endpoint: `GET /health/db`
- Status: 🟡 SUSPICIOUS / SECURITY
- Evidence:
  - Endpoint is unauthenticated.
  - It performs a database query and returns `usersChecked`.
  - On failure it returns the underlying error message.
- Impact:
  - Reveals operational/database state to unauthenticated callers.
  - Error text can disclose implementation/database details.
- Recommendation:
  - Return a minimal health response such as status only.
  - Do not expose user counts or raw database error messages.
  - Decide whether this endpoint should remain public for infrastructure probes.

### AUD-005 — Tags controller bypasses PermissionGuard

- Files:
  - `src/knowledge/tags.controller.ts`
  - `src/knowledge/article-tags.controller.ts`
  - `src/snippets/snippet-tags.controller.ts`
- Status: 🟡 SUSPICIOUS / SECURITY POLICY GAP
- Evidence:
  - Controllers use `JwtAuthGuard` + `TenantContextGuard`.
  - They do not use `PermissionGuard` / `RequirePermission`.
  - Main Knowledge/Snippet resource controllers do use all three guards.
- Impact:
  - Any authenticated tenant member can potentially create/update/delete tags and attach/detach tags, depending on service ownership checks.
  - This is inconsistent with the permission model used by the main resources.
- Recommendation:
  - Decide the intended policy explicitly.
  - If tags are workspace resources, add a dedicated permission module/action or reuse the appropriate resource permission.
  - Add authorization tests before changing behavior.

### AUD-006 — Article/Snippet tag mutation is ownership-restricted, not permission-restricted

- Files:
  - `src/knowledge/article-tags.service.ts`
  - `src/snippets/snippet-tags.service.ts`
- Status: 🟡 SUSPICIOUS / SECURITY POLICY GAP
- Evidence:
  - `requireArticle()` requires `createdBy = userId`.
  - `requireSnippet()` requires `createdBy = userId`.
  - Controllers do not invoke `PermissionGuard`.
- Impact:
  - A user with module UPDATE permission but who did not create the article/snippet cannot manage its tags.
  - Conversely, tag endpoints do not follow the module permission model.
- Recommendation:
  - Decide whether tag mutations follow ownership or module permissions.
  - Align controller and service authorization rules.

### AUD-007 — Billing feature usage does not include WORKSPACE_MEMBER

- File: `src/billing/feature.service.ts`
- Method: `listSubscriptionFeatures()`
- Status: 🟡 SUSPICIOUS
- Evidence:
  - Usage is calculated for PROJECT, TASK, KNOWLEDGE, CODE_SNIPPET and DOCUMENT.
  - There is no explicit usage calculation for WORKSPACE_MEMBER.
  - Member capacity enforcement exists separately in TenantService.
- Impact:
  - Enforcement can work while the billing UI reports an incorrect current usage for workspace members.
- Recommendation:
  - Calculate active members plus valid pending invitations consistently with the enforcement rule.
  - Add a billing usage regression test.

### AUD-008 — Feature limit checks are not atomic with resource creation

- Files:
  - `src/projects/projects.service.ts`
  - `src/tasks/tasks.service.ts`
  - `src/knowledge/knowledge.service.ts`
  - `src/snippets/snippets.service.ts`
  - `src/documents/documents.service.ts`
  - `src/billing/feature.service.ts`
- Status: 🔴 BUG/RISK
- Evidence:
  - Services calculate current usage.
  - They call `assertWithinLimit()`.
  - Resource creation occurs afterward.
  - Multiple concurrent requests can observe the same usage before either creates the new record.
- Impact:
  - Under concurrency, package limits can be exceeded.
- Recommendation:
  - Make quota enforcement and creation atomic where required.
  - Consider database constraints/transaction strategy or a serialized quota reservation mechanism.
  - Add concurrent-request tests for every quota-controlled resource.

### AUD-009 — Workspace member capacity check is also non-atomic

- File: `src/tenants/tenant.service.ts`
- Methods: `assertWorkspaceMemberCapacity()`, `addMember()`, `createInvitation()`, `acceptInvitation()`
- Status: 🔴 BUG/RISK
- Evidence:
  - Current member count and pending invitation count are read first.
  - Creation occurs afterward.
  - Multiple simultaneous member/invitation operations can pass the same capacity check.
- Impact:
  - Workspace member limits can be exceeded under concurrent operations.
- Recommendation:
  - Introduce an atomic reservation/transaction strategy.
  - Test simultaneous invitation/member creation around the exact package limit.

### AUD-010 — Checkout session sandbox success is vulnerable to concurrent completion

- File: `src/billing/checkout-session.service.ts`
- Method: `sandboxSucceed()`
- Status: 🔴 BUG/RISK
- Evidence:
  - The session is read and verified as `PENDING`.
  - Workspace, owner role, subscription, invoice and payment are created in a transaction.
  - The session is changed to `SUCCEEDED` only later inside the same transaction.
  - Two concurrent requests can both read the same `PENDING` session before either transaction commits.
- Impact:
  - Potential duplicate workspace/subscription/invoice/payment creation for one checkout session.
- Recommendation:
  - Make session completion idempotent using an atomic status transition / uniqueness constraint / locking strategy.
  - Add a concurrent sandbox completion test.

### AUD-011 — Subscription creation has a check-then-create race

- File: `src/billing/subscription.service.ts`
- Method: `create()`
- Status: 🔴 BUG/RISK
- Evidence:
  - Existing active/pending subscriptions are queried.
  - A new subscription is created afterward without an atomic uniqueness guard.
- Impact:
  - Concurrent requests can create multiple pending subscriptions for one workspace.
- Recommendation:
  - Enforce one active/pending subscription at the database/transaction boundary.

### AUD-012 — Discount usage is check-then-increment

- Files:
  - `src/billing/invoice.service.ts`
  - `src/billing/checkout-session.service.ts`
- Status: 🔴 BUG/RISK
- Evidence:
  - `usageCount` and per-tenant `DiscountUsage` are checked before incrementing.
  - Increment is performed later.
- Impact:
  - Concurrent checkouts can exceed global discount usage limits.
- Recommendation:
  - Atomically reserve/increment discount usage or enforce it with a transactional/unique constraint strategy.
  - Add concurrent discount redemption tests.

### AUD-013 — Billing route tenant parameter is not explicitly matched to tenant context

- Files:
  - `src/billing/feature.controller.ts`
  - `src/billing/subscription.controller.ts`
  - `src/billing/invoice.controller.ts`
  - `src/billing/payment.controller.ts`
  - `src/billing/checkout.controller.ts`
- Status: 🟡 SUSPICIOUS / ARCHITECTURE
- Evidence:
  - `TenantContextGuard` validates `X-Tenant-Id`.
  - Several billing controllers also accept `:tenantId` route parameters.
  - Unlike `TenantRoleController`, these controllers do not explicitly assert that the route parameter equals `req.tenant.tenantId`.
  - Services separately validate membership against the route tenant.
- Impact:
  - A user belonging to multiple tenants can send a route tenant different from the active header tenant.
  - This does not currently appear to provide cross-tenant access by itself, but it makes active-tenant semantics inconsistent and increases the risk of acting on the wrong workspace.
- Recommendation:
  - Add a reusable guard/decorator for route tenant-context matching.
  - Apply it consistently to all `:tenantId` routes.

### AUD-014 — Billing mutation endpoints lack explicit workspace permission policy

- Files:
  - `subscription.controller.ts`
  - `invoice.controller.ts`
  - `payment.controller.ts`
  - `checkout.controller.ts`
- Status: 🟡 SUSPICIOUS / POLICY GAP
- Evidence:
  - These endpoints use JWT + TenantContextGuard but not PermissionGuard.
  - Any authenticated member can reach subscription/invoice/payment operations if service membership checks pass.
- Impact:
  - Billing mutations may be available to ordinary workspace members.
- Recommendation:
  - Decide whether billing is OWNER/ADMIN-only.
  - If yes, add a dedicated BILLING permission or explicit workspace billing policy and regression tests.

### AUD-015 — Audit log retrieval loads the full table and performs N+1 enrichment

- File: `src/audit/audit.service.ts`
- Methods: `findAll()`, `findOne()`
- Status: 🟡 SUSPICIOUS / PERFORMANCE
- Evidence:
  - `AuditLog.all()` loads every audit row.
  - Each row then performs User and Tenant lookups.
  - Filtering and sorting happen in application memory.
- Impact:
  - Performance and memory usage will degrade as audit history grows.
  - `findOne()` calls `findAll()`, making a single-record lookup unnecessarily expensive.
- Recommendation:
  - Add pagination.
  - Push filters/sorting to the database.
  - Query related user/tenant data in bounded batches or via supported relational queries.
  - Implement `findOne()` as a direct query.

### AUD-016 — Audit log JSON parsing can fail the admin request

- File: `src/audit/audit.service.ts`
- Method: `findAll()`
- Status: 🟡 SUSPICIOUS
- Evidence:
  - Metadata is stored as serialized JSON.
  - Retrieval calls `JSON.parse(row.metadata)` without a per-row guard.
- Impact:
  - One malformed historical metadata row can cause an audit listing request to fail.
- Recommendation:
  - Handle malformed metadata safely and preserve the raw value or return null.

### AUD-017 — Health/error and login audit data should be reviewed for information exposure

- Files:
  - `src/health/health.controller.ts`
  - `src/auth/auth.service.ts`
- Status: 🟡 SUSPICIOUS
- Evidence:
  - Health endpoint returns raw database error text.
  - Failed login audit records may store the attempted email in metadata.
- Impact:
  - Operational details and authentication identifiers may be exposed to privileged log viewers.
- Recommendation:
  - Minimize operational error responses.
  - Define an explicit audit-data retention/privacy policy for authentication metadata.

### AUD-018 — Registration duplicate handling should be verified

- Files:
  - `src/auth/auth.service.ts`
  - `src/users/user.service.ts`
- Status: 🟡 SUSPICIOUS
- Evidence:
  - Registration directly calls `User.create()`.
  - No explicit application-level handling of unique username/email conflicts is visible in AuthService.
- Impact:
  - Duplicate registration may surface as a generic database error instead of a controlled 409-style response.
- Recommendation:
  - Verify database unique constraints.
  - Add explicit conflict handling and tests for duplicate username/email.

---

## Dead-code / legacy candidates identified so far

These are **not yet safe to delete**:

| Candidate | Reason |
|---|---|
| `AppController.getHello()` / `AppService.getHello()` | Nest scaffold endpoint |
| `app.controller.spec.ts` | Tests only scaffold endpoint |
| `test/app.e2e-spec.ts` | E2E test only covers scaffold endpoint |
| `TenantRoleService.migrateLegacyMembers()` | Explicit migration endpoint; may be temporary compatibility code |
| `BillingCatalogService.seedDefaults()` | Operational seed endpoint; useful during setup but should be reviewed for production lifecycle |
| Legacy auth/profile shapes | Need reference verification before removal |

No item above should be deleted solely from this report.

---

## Positive controls verified during Phase 1

- Global ValidationPipe uses `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- Main Project/Task/Knowledge/Snippet/Document controllers use JWT + TenantContext + PermissionGuard.
- TenantContextGuard verifies the user is a member of the requested `X-Tenant-Id`.
- Resource queries generally include tenant identifiers.
- Document upload quota enforcement is present and failed uploads are cleaned from disk.
- Platform admin billing/audit controllers use JWT + PlatformAdminGuard.
- Checkout session sandbox flow uses a transaction for workspace/subscription/invoice/payment creation.

---

## Phase 2 — required before cleanup

1. Complete service-level reference tracing for every public method.
2. Review all DTOs for unused/duplicate definitions.
3. Review every billing mutation and discount transition for state-machine correctness.
4. Review file lifecycle and upload/delete behavior.
5. Review database constraints against service-level uniqueness checks.
6. Review every cross-tenant query.
7. Review all tests and identify business-critical flows with no regression test.
8. Run backend build, lint and test suite from the audited branch.
9. Only then classify code as ⚫ DEAD and perform deletions.

## Audit rule

A code path is not considered dead merely because it has no frontend caller. Controllers may be used by external clients, scripts, Postman, integrations, or operational tooling. Deletion requires reference verification plus confirmation that the endpoint is not part of an intended external API.
