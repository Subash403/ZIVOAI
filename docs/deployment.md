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

Before launch, configure the production values named in `.env.example`: `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PRIVATE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` when Google login is enabled. The Google callback is `/api/auth/google/callback` on the deployed origin.

## Local SQLite development

The SQLite client is generated during install. After changing `prisma/schema.prisma`, synchronize only the local development database with:

```bash
npm run db:push:sqlite
```

This command is for local SQLite development only. It is not a production migration and must not be pointed at Neon.

## Private downloads

Production private downloads require Cloudflare R2 presigned URLs. Application-level buffering of private objects is disabled in production. If R2 presigning fails, the download route returns a safe temporary-unavailable response instead of reading the object into application memory.
