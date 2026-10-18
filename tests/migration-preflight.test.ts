import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('PostgreSQL migration history declares its provider lock', () => {
  const lock = fs.readFileSync(path.join(root, 'prisma', 'migrations', 'migration_lock.toml'), 'utf8');
  assert.match(lock, /provider\s*=\s*"postgresql"/);
});

test('predeploy migration gate refuses a non-PostgreSQL database', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'predeploy-postgres.mjs')], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: 'file:./prisma/dev.db', DIRECT_URL: 'file:./prisma/dev.db' },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /DATABASE_URL must be a PostgreSQL connection string/i);
});
