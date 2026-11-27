# Cloudflare R2 Bucket CORS Configuration Guide for Zivo AI

When uploading private project files (ZIP source code, models, reports) directly from the browser to Cloudflare R2, modern browsers require that the R2 bucket explicitly authorize the web application's origin via **Cross-Origin Resource Sharing (CORS)**.

If CORS is not configured, the browser blocks the preflight `OPTIONS` request with `status: 0`, and the upload fails immediately before transferring data.

---

## 1. Quick Setup via Script

If you have configured `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` in your `.env` file, run:

```bash
npx tsx scripts/setup-r2-cors.ts
```

This will automatically connect to your R2 private bucket and apply the correct CORS rules.

---

## 2. Cloudflare Dashboard Setup (Manual)

If you prefer applying CORS in the Cloudflare Dashboard:

1. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. In the left navigation, navigate to **R2** > **Overview**.
3. Select your private bucket: `zivo-private-files` (or the bucket configured in `R2_BUCKET_PRIVATE`).
4. Click on the **Settings** tab.
5. Scroll down to **CORS Policy** and click **Add CORS Policy** (or **Edit CORS Policy**).
6. Paste the following JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://zivoai.vercel.app",
      "https://zivo.ai",
      "https://www.zivo.ai",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

7. Click **Save**.

---

## 3. Environment Variables Required for Production

In your production environment (e.g. Vercel, Railway, Docker):

```env
# Cloudflare R2 Private Deliverable Storage
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_PRIVATE="zivo-private-files"
```

*Note: In local development (`NODE_ENV !== 'production'`), if R2 credentials are not set, Zivo AI automatically streams deliverables into local `storage/private-downloads/`. In production, Cloudflare R2 is strictly required to prevent serverless data loss.*
