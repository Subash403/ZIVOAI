# Deployment and database setup

## Production PostgreSQL

Production must run the migration gate before serving application traffic:

```bash
npm ci
npm run db:migrate:postgres:predeploy
npm run build
```

The gate requires both `DATABASE_URL` and `DIRECT_URL` to be PostgreSQL URLs. It runs `prisma migrate deploy --schema prisma/schema.postgresql.prisma` and exits nonzero on missing configuration, migration discovery errors, connection errors, or failed SQL. Do not replace it with `prisma db push`, and do not put migrations inside `next build`.

For Vercel, configure the project’s **Build Command** to run:

```bash
npm run db:migrate:postgres:predeploy && npm run build
```

Set `DATABASE_URL` and `DIRECT_URL` in the Vercel Production environment. The migration gate must use a direct, migration-capable PostgreSQL connection for `DIRECT_URL`; never use the local SQLite URL. A separate CI job may run the same gate before allowing the Vercel deployment to proceed. If the gate fails, the deployment must be blocked rather than serving the new application code.

Before launch, configure the production values named in `.env.example`: `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PRIVATE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` when Google login is enabled. The Google callback is `/api/auth/google/callback` on the deployed origin.

## Razorpay test mode

The server requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; the key ID is returned only as Checkout configuration after the server creates a real provider order. Use a matching Test key pair for Test Mode and a separate matching Live pair for Live Mode. Do not set or rely on `NEXT_PUBLIC_RAZORPAY_KEY_ID` for payment creation.

Configure a separate Test Mode webhook at `https://<test-origin>/api/payments/webhook` with its Test Mode secret in `RAZORPAY_WEBHOOK_SECRET`. Subscribe to `payment.captured`, `order.paid`, and `payment.failed`. Configure the equivalent webhook and distinct secret again in Live Mode. Enable Razorpay auto-capture: authorized payments remain pending until a verified captured event arrives.

## Private deliverable uploads

Private deliverables are uploaded directly from the authenticated admin browser to the private R2 bucket using a ten-minute presigned `PUT`; application routes never receive the file body. Finalization performs a `HeadObject` check for the exact key, size, content type, and signed metadata before the project route accepts the short-lived proof.

Configure R2 bucket CORS with the exact admin application origin (for example `https://admin.example.com`), method `PUT`, and headers `content-type`, `x-amz-meta-original-name`, and `x-amz-meta-upload-kind`. Do not use `*` for origins, do not expose R2 API credentials, and do not make the private bucket public. The current single-PUT flow deliberately supports files up to 2 GB; add R2 multipart presigned-part handling only when resumable uploads or files above that limit are required. Unfinalized objects are harmless but should be removed with an R2 lifecycle rule for the `deliverables/` prefix after a suitable retention window.

## Local SQLite development

The SQLite client is generated during install. After changing `prisma/schema.prisma`, synchronize only the local development database with:

```bash
npm run db:push:sqlite
```

This command is for local SQLite development only. It is not a production migration and must not be pointed at Neon.

## Private downloads

Production private downloads require Cloudflare R2 presigned URLs. Application-level buffering of private objects is disabled in production. If R2 presigning fails, the download route returns a safe temporary-unavailable response instead of reading the object into application memory.
