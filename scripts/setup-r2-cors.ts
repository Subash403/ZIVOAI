/**
 * Script: scripts/setup-r2-cors.ts
 * Configures or verifies CORS policy for Cloudflare R2 private bucket.
 * Run with: npx tsx scripts/setup-r2-cors.ts
 */

import { PutBucketCorsCommand, GetBucketCorsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getR2Client, getPrivateBucketName, isR2Configured } from '../src/lib/storage';

async function main() {
  console.log('=== ZIVO AI Cloudflare R2 CORS Configuration Check ===\n');

  if (!isR2Configured()) {
    console.error('❌ Cloudflare R2 credentials are NOT configured.');
    console.error('Required environment variables in .env:');
    console.error('  R2_ACCOUNT_ID');
    console.error('  R2_ACCESS_KEY_ID');
    console.error('  R2_SECRET_ACCESS_KEY');
    console.error('  R2_BUCKET_PRIVATE (Optional, defaults to "zivo-private-files")\n');
    process.exit(1);
  }

  const client = getR2Client();
  const bucketName = getPrivateBucketName();

  console.log(`Checking bucket: "${bucketName}"...`);

  // 1. Verify bucket access
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log('✅ Bucket existence verified and accessible.');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Could not access bucket "${bucketName}":`, errorMsg);
    console.error('Ensure the bucket exists in your Cloudflare dashboard and your API token has Admin/Object Read & Write permissions.');
    process.exit(1);
  }

  // 2. Apply comprehensive CORS configuration
  const corsRules = [
    {
      AllowedOrigins: [
        'https://zivoai.vercel.app',
        'https://zivo.ai',
        'https://www.zivo.ai',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ],
      AllowedMethods: ['GET', 'PUT', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ];

  try {
    console.log('Applying CORS configuration to R2 bucket...');
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: corsRules,
        },
      })
    );
    console.log('✅ Successfully applied CORS policy to private R2 bucket:');
    console.log(JSON.stringify(corsRules, null, 2));

    // Verify
    const currentCors = await client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
    console.log('\nVerified current CORS rules:', JSON.stringify(currentCors.CORSRules, null, 2));
    console.log('\n🎉 R2 Private bucket is ready for direct browser uploads!');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to update CORS policy:', errorMsg);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
