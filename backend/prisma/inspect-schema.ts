import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const findEnv = () => {
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) return envPath;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
};

const envPath = findEnv();
dotenv.config(envPath ? { path: envPath } : {});

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔍 Syncing tenants in database...');
    
    // Insert default Tenant ORG001 (SHIELD)
    await client.query(`
      INSERT INTO "Tenant" (id, name, slug, plan, "createdAt", "updatedAt")
      VALUES ('ORG001', 'SHIELD', 'shield', 'ENTERPRISE', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = 'SHIELD', slug = 'shield', plan = 'ENTERPRISE', "updatedAt" = NOW();
    `);
    console.log('✅ Synchronized Tenant ORG001 (SHIELD) successfully.');

    // Let's also insert other tenants that might be expected or needed
    await client.query(`
      INSERT INTO "Tenant" (id, name, slug, plan, "createdAt", "updatedAt")
      VALUES ('ORG002', 'ARGUS', 'argus', 'ENTERPRISE', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = 'ARGUS', slug = 'argus', plan = 'ENTERPRISE', "updatedAt" = NOW();
    `);
    console.log('✅ Synchronized Tenant ORG002 (ARGUS) successfully.');

    const tenantsRes = await client.query('SELECT * FROM "Tenant";');
    console.log('Tenants currently in database:', tenantsRes.rows);
  } catch (err) {
    console.error('Error syncing tenants:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
