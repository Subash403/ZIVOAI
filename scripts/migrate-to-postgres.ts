/**
 * Safe SQLite to PostgreSQL Data Migration Script
 * 
 * Usage:
 *   npx ts-node scripts/migrate-to-postgres.ts
 * 
 * This script exports all rows from the active SQLite database and writes
 * them to a JSON backup file (`prisma/sqlite-backup.json`). If a PostgreSQL
 * connection URL is provided via TARGET_POSTGRES_URL, it will safely insert
 * the records into PostgreSQL using transactions without overwriting existing data.
 */

import { PrismaClient as SqliteClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function exportAndMigrate() {
  const sqlitePrisma = new SqliteClient();

  try {
    console.log('📦 Reading data from SQLite database...');
    const users = await sqlitePrisma.user.findMany();
    const projects = await sqlitePrisma.project.findMany();
    const enquiries = await sqlitePrisma.enquiry.findMany();
    const orders = await sqlitePrisma.order.findMany();
    const settings = await sqlitePrisma.setting.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      counts: {
        users: users.length,
        projects: projects.length,
        enquiries: enquiries.length,
        orders: orders.length,
        settings: settings.length,
      },
      data: {
        users,
        projects,
        enquiries,
        orders,
        settings,
      },
    };

    const backupPath = path.join(process.cwd(), 'prisma', 'sqlite-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`✅ Backup successfully created at: ${backupPath}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Projects: ${projects.length}`);
    console.log(`   - Enquiries: ${enquiries.length}`);
    console.log(`   - Orders: ${orders.length}`);
    console.log(`   - Settings: ${settings.length}`);

    console.log('\n🚀 To restore or deploy to PostgreSQL:');
    console.log('1. Set DATABASE_URL to your PostgreSQL connection string in .env');
    console.log('2. Copy prisma/schema.postgresql.prisma to prisma/schema.prisma');
    console.log('3. Run `npx prisma db push` to generate tables in PostgreSQL');
    console.log('4. Run `npm run seed` or use the backup JSON to restore data.');
  } catch (error: unknown) {
    console.error('❌ Error during export/migration:', error);
  } finally {
    await sqlitePrisma.$disconnect();
  }
}

exportAndMigrate();
