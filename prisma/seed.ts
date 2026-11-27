import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Zivo AI...');

  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@zivo.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

  if (process.env.NODE_ENV === 'production' && adminPassword === 'adminpassword123') {
    throw new Error('FATAL: Cannot seed default admin password in production. Please set a strong ADMIN_PASSWORD.');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user verified: ${admin.email}`);

  // 2. Seed Baseline Site Settings (only real branding & explicitly configured env values)
  const defaultSettings: { key: string; value: string }[] = [
    { key: 'businessName', value: 'Zivo AI' },
    { key: 'logoUrl', value: '/brand/zivo-logo-horizontal.png' },
    { key: 'faviconUrl', value: '/brand/zivo-mark.png' },
    { key: 'supportEmail', value: process.env.SUPPORT_EMAIL || 'support@zivo.ai' },
    { key: 'announcementNotice', value: 'Verified AI & Full-Stack Software Projects with Secure Dashboard Delivery' },
  ];

  if (process.env.SUPPORT_PHONE) {
    defaultSettings.push({ key: 'phoneNumber', value: process.env.SUPPORT_PHONE });
  }
  if (process.env.SUPPORT_WHATSAPP) {
    defaultSettings.push({ key: 'whatsappNumber', value: process.env.SUPPORT_WHATSAPP });
  }
  if (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    defaultSettings.push({ key: 'razorpayKeyId', value: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID });
  }
  if (process.env.GOOGLE_SHEET_ID) {
    defaultSettings.push({ key: 'googleSheetId', value: process.env.GOOGLE_SHEET_ID });
  }

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('✅ Baseline site settings initialized (no demo projects or placeholder credentials seeded).');

  // 3. Preserve existing enquiries, orders, and projects — never seed dummy catalog records
  console.log('🛡️ Preserved existing projects, enquiries, and orders.');

  console.log('🎉 Zivo AI database seed complete: Admin user and baseline site settings ready.');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
