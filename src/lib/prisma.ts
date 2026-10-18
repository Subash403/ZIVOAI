import { PrismaClient as SqliteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '../generated/postgresql';

// Re-export Prisma namespace and types for convenient unified access across the app
export { Prisma } from '@prisma/client';

export type AppPrismaClient = SqliteClient | PostgresClient;

/**
 * Determines whether the current environment should connect to PostgreSQL (Neon/Vercel)
 * or local SQLite (dev.db).
 */
export function isPostgresEnvironment(): boolean {
  if (process.env.DATABASE_PROVIDER === 'postgresql') return true;
  if (process.env.DATABASE_PROVIDER === 'sqlite') return false;

  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    return true;
  }

  // On Vercel deployments, if DATABASE_URL is not explicitly a local file, use Postgres
  if (process.env.VERCEL === '1' && !dbUrl.startsWith('file:')) {
    return true;
  }

  return false;
}

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

function createPrismaClient(): AppPrismaClient {
  const isDev = process.env.NODE_ENV === 'development';
  const logOptions: ('query' | 'error' | 'warn')[] = isDev ? ['query', 'error', 'warn'] : ['error'];

  if (isPostgresEnvironment()) {
    return new PostgresClient({
      log: logOptions,
    });
  }

  return new SqliteClient({
    log: logOptions,
  });
}

// Export singleton instance typed as SqliteClient to preserve complete IDE autocomplete
// and identical API compatibility across both Prisma clients
export const prisma = (globalForPrisma.prisma ?? createPrismaClient()) as SqliteClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

