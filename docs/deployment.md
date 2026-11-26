# Zivo AI — Deployment, Operations & Release Readiness Guide

This guide covers safe deployment on **Vercel** with **Neon PostgreSQL**, **Cloudflare R2**, **Razorpay**, and **Nodemailer (SMTP)**.

> **Safety Rule:** Never run local development commands (`db:push:sqlite`, `npm test`) against production Neon credentials, and never execute live Razorpay charges or refunds during verification.

---

## 1. Environment Variable Inventory (Vercel)

Run `npm run env:check` locally (or `npm run env:check -- --strict` in CI) to validate configuration without exposing secret values.

| Category | Variable | Preview / Staging | Production | Notes |
| --- | --- | --- | --- | --- |
| Database | `DATABASE_URL` | Neon Staging pooled URL | Neon Prod pooled URL (`sslmode=require`) | PostgreSQL URL only in Vercel |
| Database | `DIRECT_URL` | Neon Staging direct URL | Neon Prod direct URL | Required by `prisma migrate deploy` |
| Auth | `JWT_SECRET` | Unique 32+ char secret | Unique 32+ char secret | Never reuse dev/staging secrets |
| App | `NEXT_PUBLIC_APP_URL` | Staging HTTPS origin | Production HTTPS origin | Used for OAuth callbacks & links |
| Payments | `RAZORPAY_KEY_ID` | `rzp_test_*` | `rzp_live_*` | Server-only; never mix Test & Live |
| Payments | `RAZORPAY_KEY_SECRET` | Test secret | Live secret | Server-only |
| Payments | `RAZORPAY_WEBHOOK_SECRET` | Test webhook secret | Live webhook secret | Separate endpoint per environment |
| Storage | `R2_ACCOUNT_ID` | Staging/Prod R2 account | Prod R2 account | Cloudflare R2 |
| Storage | `R2_ACCESS_KEY_ID` | Scoped R2 key | Scoped R2 key | Least-privilege bucket permissions |
| Storage | `R2_SECRET_ACCESS_KEY` | Scoped R2 secret | Scoped R2 secret | Server-only |
| Storage | `R2_BUCKET_PRIVATE` | Staging private bucket | Prod private bucket | Keep **non-public**; presigned GET only |
| Storage | `R2_BUCKET_PUBLIC` | Staging public bucket | Prod public bucket | Public thumbnails/gallery images |
| Storage | `R2_PUBLIC_BASE_URL` | Public bucket CDN URL | Public bucket CDN URL | HTTPS base URL |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Test/sandbox SMTP | Verified domain SMTP | Required in prod; missing SMTP fails closed |
| Ops / Cron | `CRON_SECRET` | Random 32+ char secret | Random 32+ char secret | Bearer token for `POST /api/cron/notifications` |
| OAuth (Optional) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Optional | Google button auto-hides when unset |

---

## 2. Vercel Build & Pre-Deploy Migration Gate

Configure the Vercel **Build Command** to run the PostgreSQL migration predeploy gate before building:

```bash
npm run db:migrate:postgres:predeploy && npm run build
```

- `scripts/predeploy-postgres.mjs` verifies both `DATABASE_URL` and `DIRECT_URL` are PostgreSQL URLs, then executes `prisma migrate deploy --schema prisma/schema.postgresql.prisma`.
- Never replace `migrate deploy` with `prisma db push` in staging or production.
- See [migration-and-rollback.md](./migration-and-rollback.md) for the exact Neon migration, backup, and rollback runbook.

---

## 3. Razorpay Configuration (Test vs Live Isolation)

1. **Test Mode (Preview/Staging):**
   - Set `RAZORPAY_KEY_ID=rzp_test_...`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.
   - Configure Razorpay Test webhook URL: `https://<staging-origin>/api/payments/webhook`.
   - Subscribe to events: `payment.captured`, `order.paid`, `payment.failed`, `refund.created`, `refund.processed`.
2. **Live Mode (Production):**
   - Configure a separate Live webhook URL: `https://<prod-origin>/api/payments/webhook` with its own `RAZORPAY_WEBHOOK_SECRET`.
   - Enable Razorpay **auto-capture** so authorized payments transition cleanly to `captured`.
   - Keep `NEXT_PUBLIC_RAZORPAY_KEY_ID` unset or strictly aligned; checkout reads the server-validated key returned from `POST /api/payments/create-order`.

---

## 4. Cloudflare R2 Security & Lifecycle

- Keep `R2_BUCKET_PRIVATE` strictly private (no public bucket policy).
- Production downloads issue **1-hour presigned R2 GET URLs** only after server-side ownership/token, payment (`PAID`), expiry, and download-limit checks pass.
- Configure R2 bucket CORS on `R2_BUCKET_PRIVATE` with exact admin origin (never `*`), method `PUT`, and headers: `content-type`, `x-amz-meta-original-name`, `x-amz-meta-upload-kind`.
- Add an R2 lifecycle rule to purge orphaned uploads under `deliverables/` that were never finalized.

---

## 5. Email Deliverability & Retry Worker

- In development/test without SMTP, notification logs record status `SIMULATED` and **never** mark `Order.notificationSent = true`.
- In production without SMTP, sends fail closed as `FAILED` and queue for retry in `OrderNotification`.
- **DNS Checklist (Manual Verification Required before Launch):**
  - Verify `SPF` TXT record authorizes the SMTP provider.
  - Verify `DKIM` CNAME/TXT keys are active and passing.
  - Verify `DMARC` TXT record (`v=DMARC1; p=quarantine;` or `p=none` during warmup) is published for the `SMTP_FROM` domain.
  - Send a test order confirmation and lead acknowledgement to Gmail and Outlook to confirm inbox placement.
- **Scheduled Retry & Stock Reservation Expiry Worker:**
  - Trigger `POST https://<origin>/api/cron/notifications` every 5–15 minutes using Vercel Cron (Pro) or an external scheduler (GitHub Actions / Cloudflare Cron Trigger / UptimeRobot) with header:
    ```
    Authorization: Bearer <CRON_SECRET>
    ```
  - This processes due `FAILED` order notifications (with exponential backoff) and expires stale 15-minute `StockReservation` locks.

---

## 6. Monitoring, Health Checks & Alerting

- **Admin Health Endpoint:** `GET /api/admin/health` (requires authenticated `ADMIN` session). Returns:
  - Redacted environment readiness & Razorpay mode (`test` vs `live`).
  - Database connectivity status.
  - Pending operational alerts:
    - Orders in `RECONCILIATION_REQUIRED` (`STOCK_CONFLICT`, `ASSET_MISSING`).
    - Failed `OrderNotification` outbox items.
    - Failed `PaymentWebhookEvent` records.
    - Active vs expired `StockReservation` counts.
- **Admin Dashboard:** `/admin` surfaces an Operational Alerts banner whenever reconciliation orders, failed emails, or failed webhooks are greater than zero.
- **Recommended External Alerts:**
  1. Synthetic uptime monitor on `GET /` and `GET /projects`.
  2. Vercel Log Drain / error alerting for HTTP `5xx` spikes on `/api/payments/*` and `/api/orders/download/*`.
  3. Scheduled check on `POST /api/cron/notifications` response payload (alert if `failedCount > 0`).

---

## 7. Staging Smoke Test Checklist (Pre-Production Sign-Off)

Execute on a Preview/Staging deployment using **Razorpay Test Mode** before promoting to Production:

1. **Public Catalog & Visibility:** Confirm unpublished/unavailable projects return `404` on `/api/projects/[id]`, `call` projects mask `price: 0`, and no `downloadFileUrl` appears in public JSON.
2. **Auth & Account Takeover Protection:** Confirm registering an existing email returns `409`, login works, password change / "Sign out all devices" invalidates old cookies.
3. **Razorpay Test Checkout:** Complete a test purchase; verify `PAID` status, `ASSET_READY` delivery status, email receipt, and automatic appearance inside `/account`.
4. **Download Security:** Verify owner downloads succeed inside `/account` (`200`/redirect to 1-hour presigned R2 URL, `downloadCount` increments, transitions to `DELIVERED`), while non-owners receive `403`.
5. **OTP Order Tracking:** Verify `POST /api/orders/track` requires 6-digit email OTP for unauthenticated lookups and rate-limits repeated attempts (`429`).
6. **Refund & Access Revocation:** Record a test refund in `/admin/orders`; verify `paymentStatus: 'REFUNDED'`, `AdminAuditLog` entry created, and subsequent download attempt returns `402`.
7. **Admin Authorization:** Verify anonymous and `CUSTOMER` sessions receive `401` on `/api/admin/dashboard`, `/api/admin/customers`, `/api/admin/health`, `/api/orders`, and `/api/settings` (`PUT`).
8. **Build Warnings Note (ZAI-072):** Two upstream Prisma Client dynamic-tracing warnings (`src/generated/postgresql/index.js` and `runtime/library.js`) are known Next.js 16 Turbopack + Prisma 6.19 artifacts and do not affect runtime execution.

---

## 8. Local SQLite Development

```bash
npm run db:push:sqlite
npm run dev
```

Never point `db:push:sqlite` at Neon PostgreSQL.
