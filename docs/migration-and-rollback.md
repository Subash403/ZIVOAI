# Zivo AI — Database Migration, Backup & Rollback Runbook

## 1. Schema Changes Summary

Migration ID: `20261126000000_security_payments_audit_hardening`  
Location: [`prisma/migrations/20261126000000_security_payments_audit_hardening/migration.sql`](../prisma/migrations/20261126000000_security_payments_audit_hardening/migration.sql)

All changes are **strictly additive** (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, guarded `FOREIGN KEY` constraints) — zero destructive drops, zero column renames, and zero table rewrites.

### Added Columns
- `User`: `emailVerified` (BOOLEAN DEFAULT false), `tokenVersion` (INTEGER DEFAULT 0)
- `Order`: `reconciliationStatus` (TEXT), `receiptTokenVersion` (INTEGER DEFAULT 0)
- `Enquiry`: `assignedTo` (TEXT), `nextFollowUpAt` (TIMESTAMP(3)), `archived` (BOOLEAN DEFAULT false), `tags` (TEXT)
- `NotificationLog`: `providerMessageId` (TEXT), `rejectedRecipients` (TEXT)

### Added Tables
- `StockReservation` — 15-minute atomic checkout inventory lock (`ACTIVE` / `CONSUMED` / `RELEASED` / `EXPIRED`)
- `DownloadLog` — Full audit trail for download issuance, serves, denials, admin bypasses, and missing R2 assets
- `Refund` — Refund ledger linked to `Order` (`PENDING` / `PROCESSED` / `FAILED`)
- `AdminAuditLog` — Immutable audit trail for admin mutations, settings diffs, refunds, and download bypasses
- `OrderTrackingOtp` — Hashed 6-digit email OTP verification challenges for unauthenticated order tracking

### Added Indexes
- `Project(published, available, featured, createdAt)`
- `Order(paymentStatus, createdAt)`, `Order(reconciliationStatus)`
- `Enquiry(archived, status, createdAt)`
- `StockReservation(projectId, status, expiresAt)`
- `DownloadLog(orderId, createdAt)`, `DownloadLog(userId, createdAt)`
- `Refund(orderId, createdAt)`
- `AdminAuditLog(resourceType, resourceId, createdAt)`, `AdminAuditLog(actorUserId, createdAt)`
- `OrderTrackingOtp(orderId, email, createdAt)`

---

## 2. Pre-Migration Backup & Neon Snapshot Procedure

**Before running any migration against Neon Staging or Production:**

1. Create a **Neon Branch Snapshot** (instant point-in-time recovery) in the Neon Console before deployment.
2. Optionally export a logical JSON backup snapshot using the built-in backup script against the target environment:
   ```bash
   npm run db:backup
   ```
   Verify the generated timestamped backup file in `backups/` is non-empty and stored securely outside the repository.
3. Run a backup/restore verification drill on a **non-production Neon branch** (never production) using `npm run db:restore` to confirm restore integrity.

---

## 3. Applying the Migration (Staging First, Then Production)

```bash
# 1. Verify environment variables without printing secrets
npm run env:check -- --strict

# 2. Apply additive PostgreSQL migrations via DIRECT_URL
npm run db:migrate:postgres:predeploy

# 3. Verify migration status
npx prisma migrate status --schema prisma/schema.postgresql.prisma
```

Because the migration is purely additive with safe defaults, existing running instances of the previous release remain schema-compatible during a rolling Vercel cutover.

---

## 4. Application Rollback Procedure (Vercel)

If a newly promoted Vercel deployment exhibits errors:

1. **Instant Traffic Rollback:** In Vercel Dashboard → Project → **Deployments**, select the previous verified production deployment and click **Instant Rollback** (or run `vercel rollback`).
2. **No Destructive Schema Rollback Needed:** Because `20261126000000_security_payments_audit_hardening` only adds nullable/defaulted columns and new tables, the previous application build continues to operate safely without dropping tables or losing audit/refund data.
3. **Emergency Schema Revert (Only if explicitly required on a clean staging branch):**
   > **Warning:** Dropping new tables permanently deletes recorded `Refund`, `AdminAuditLog`, and `DownloadLog` rows. Only execute after exporting data and obtaining explicit approval.
   ```sql
   DROP TABLE IF EXISTS "OrderTrackingOtp";
   DROP TABLE IF EXISTS "AdminAuditLog";
   DROP TABLE IF EXISTS "Refund";
   DROP TABLE IF EXISTS "DownloadLog";
   DROP TABLE IF EXISTS "StockReservation";

   ALTER TABLE "NotificationLog"
     DROP COLUMN IF EXISTS "providerMessageId",
     DROP COLUMN IF EXISTS "rejectedRecipients";

   ALTER TABLE "Enquiry"
     DROP COLUMN IF EXISTS "assignedTo",
     DROP COLUMN IF EXISTS "nextFollowUpAt",
     DROP COLUMN IF EXISTS "archived",
     DROP COLUMN IF EXISTS "tags";

   ALTER TABLE "Order"
     DROP COLUMN IF EXISTS "reconciliationStatus",
     DROP COLUMN IF EXISTS "receiptTokenVersion";

   ALTER TABLE "User"
     DROP COLUMN IF EXISTS "emailVerified",
     DROP COLUMN IF EXISTS "tokenVersion";
   ```
4. **Point-in-Time Database Restore:** If data corruption occurs, restore the pre-deploy Neon branch snapshot in Neon Console and point `DATABASE_URL` / `DIRECT_URL` to the recovered endpoint.
