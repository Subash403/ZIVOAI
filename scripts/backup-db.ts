import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function backup() {
  console.log('📦 Starting database export and backup...');

  const users = await prisma.user.findMany();
  const settings = await prisma.setting.findMany();
  const projects = await prisma.project.findMany();
  const orders = await prisma.order.findMany();
  const enquiries = await prisma.enquiry.findMany();
  const timelines = await prisma.customProjectTimeline.findMany();
  const notifications = await prisma.notificationLog.findMany();
  const wishlists = await prisma.wishlistItem.findMany();

  const backupData = {
    timestamp: new Date().toISOString(),
    counts: {
      users: users.length,
      settings: settings.length,
      projects: projects.length,
      orders: orders.length,
      enquiries: enquiries.length,
      timelines: timelines.length,
      notifications: notifications.length,
      wishlists: wishlists.length,
    },
    users,
    settings,
    projects,
    orders,
    enquiries,
    timelines,
    notifications,
    wishlists,
  };

  const backupDir = path.join(process.cwd(), 'prisma', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, 'sqlite-backup.json');
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`✅ Backup successfully saved to ${backupFile}`);
  console.log('📊 Backup summary:', backupData.counts);
}

backup()
  .catch((e) => {
    console.error('❌ Backup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
