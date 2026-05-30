import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const root = process.cwd();
const envPath = path.join(root, '.env.admin');
const schemaPath = path.join(root, 'supabase', 'fresh-schema.sql');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const fileEnv = parseEnvFile(envPath);
const databaseUrl =
  process.env.SUPABASE_DB_POOLER_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  fileEnv.SUPABASE_DB_POOLER_URL ||
  fileEnv.SUPABASE_DB_URL ||
  fileEnv.DATABASE_URL;

if (!databaseUrl) {
  console.error([
    'Missing direct database connection string.',
    'Add SUPABASE_DB_POOLER_URL or SUPABASE_DB_URL to .env.admin, then run npm run db:fresh.',
    'Use the new Supabase project connection string and replace [YOUR-PASSWORD].',
  ].join('\n'));
  process.exit(1);
}

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found: ${schemaPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf8');
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log('Connecting to Supabase database...');
  await client.connect();
  console.log('Applying fresh Bizzy App Business Management System schema...');
  await client.query(sql);
  console.log('Fresh schema applied successfully.');
} catch (error) {
  console.error('Fresh schema failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
