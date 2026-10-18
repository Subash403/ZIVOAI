import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function restore() {
  console.log('🔄 Starting database restore into target database...');

  const backupFile = path.join(process.cwd(), 'prisma', 'backups', 'sqlite-backup.json');
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found at ${backupFile}`);
  }

  const rawData = fs.readFileSync(backupFile, 'utf-8');
  const backup = JSON.parse(rawData);

  console.log(`📂 Read backup from ${backup.timestamp}`);

  // 1. Restore Users
  if (Array.isArray(backup.users)) {
    for (const u of backup.users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          password: u.password,
          googleId: u.googleId,
          avatarUrl: u.avatarUrl,
          role: u.role,
          phone: u.phone,
          college: u.college,
          department: u.department,
          year: u.year,
        },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          googleId: u.googleId,
          avatarUrl: u.avatarUrl,
          role: u.role,
          phone: u.phone,
          college: u.college,
          department: u.department,
          year: u.year,
        },
      });
    }
    console.log(`✅ Users restored (${backup.users.length} records)`);
  }

  // 2. Restore Settings
  if (Array.isArray(backup.settings)) {
    for (const s of backup.settings) {
      await prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: {
          key: s.key,
          value: s.value,
        },
      });
    }
    console.log(`✅ Settings restored (${backup.settings.length} records)`);
  }

  // 3. Restore Projects
  if (Array.isArray(backup.projects) && backup.projects.length > 0) {
    for (const p of backup.projects) {
      await prisma.project.upsert({
        where: { slug: p.slug },
        update: p,
        create: p,
      });
    }
    console.log(`✅ Projects restored (${backup.projects.length} records)`);
  }

  // 4. Restore Enquiries & Timelines
  if (Array.isArray(backup.enquiries) && backup.enquiries.length > 0) {
    for (const e of backup.enquiries) {
      const enquiryData = { ...e };
      delete (enquiryData as Record<string, unknown>).timeline;
      await prisma.enquiry.upsert({
        where: { leadId: e.leadId },
        update: enquiryData,
        create: enquiryData,
      });
    }
    console.log(`✅ Enquiries restored (${backup.enquiries.length} records)`);
  }

  if (Array.isArray(backup.timelines) && backup.timelines.length > 0) {
    for (const t of backup.timelines) {
      await prisma.customProjectTimeline.upsert({
        where: { id: t.id },
        update: t,
        create: t,
      });
    }
    console.log(`✅ Timelines restored (${backup.timelines.length} records)`);
  }

  // 5. Restore Orders
  if (Array.isArray(backup.orders) && backup.orders.length > 0) {
    for (const o of backup.orders) {
      await prisma.order.upsert({
        where: { orderId: o.orderId },
        update: o,
        create: o,
      });
    }
    console.log(`✅ Orders restored (${backup.orders.length} records)`);
  }

  console.log('🎉 Target database restore completed successfully!');
}

restore()
  .catch((e) => {
    console.error('❌ Restore failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
