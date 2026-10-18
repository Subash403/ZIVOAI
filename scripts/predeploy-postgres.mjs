import { execFileSync } from 'node:child_process';
import process from 'node:process';

const databaseUrl = process.env.DATABASE_URL || '';
const directUrl = process.env.DIRECT_URL || '';

if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.error('Refusing PostgreSQL migration: DATABASE_URL must be a PostgreSQL connection string.');
  process.exit(1);
}

if (!directUrl.startsWith('postgresql://') && !directUrl.startsWith('postgres://')) {
  console.error('Refusing PostgreSQL migration: DIRECT_URL must be a PostgreSQL connection string.');
  process.exit(1);
}

const prismaCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
execFileSync(prismaCommand, ['--no-install', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.postgresql.prisma'], {
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});
