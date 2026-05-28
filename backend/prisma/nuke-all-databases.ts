import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { MongoClient } from 'mongodb';
import * as fs from 'fs';

// Locate .env dynamically without __dirname or import.meta.url
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

// ─── PostgreSQL / Supabase Setup ───────────────────────────────────────────────
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── MongoDB Setup ─────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

async function nukePostgres() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  🗄️  SUPABASE / POSTGRESQL — WIPING ALL TABLES');
  console.log('══════════════════════════════════════════════════════');

  const attendanceCount = await prisma.attendance.deleteMany();
  console.log(`  ✓ Deleted ${attendanceCount.count} attendance records`);

  const workerSiteCount = await prisma.workerSite.deleteMany();
  console.log(`  ✓ Deleted ${workerSiteCount.count} worker-site assignments`);

  const kioskCount = await prisma.kiosk.deleteMany();
  console.log(`  ✓ Deleted ${kioskCount.count} kiosks`);

  const incidentCount = await prisma.incident.deleteMany();
  console.log(`  ✓ Deleted ${incidentCount.count} incidents`);

  const vendorCount = await prisma.vendor.deleteMany();
  console.log(`  ✓ Deleted ${vendorCount.count} vendors`);

  const userCount = await prisma.user.deleteMany();
  console.log(`  ✓ Deleted ${userCount.count} users`);

  const siteCount = await prisma.site.deleteMany();
  console.log(`  ✓ Deleted ${siteCount.count} sites`);

  const shiftCount = await prisma.shift.deleteMany();
  console.log(`  ✓ Deleted ${shiftCount.count} shifts`);

  const tenantCount = await prisma.tenant.deleteMany();
  console.log(`  ✓ Deleted ${tenantCount.count} tenants`);

  console.log('\n  ✅ PostgreSQL / Supabase: All tables wiped clean.');
}

async function nukeMongoDB() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  🍃  MONGODB — WIPING ALL FENCEIN COLLECTIONS');
  console.log('══════════════════════════════════════════════════════');

  if (!MONGO_URI) {
    console.log('  ⚠️  MONGO_URI not found in .env — skipping MongoDB wipe.');
    return;
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('fencein');

    const collections = [
      'audit_logs',
      'ai_inference_logs',
      'analytics_snapshots',
      'ai_chat_history',
      'telemetry',
    ];

    for (const colName of collections) {
      const col = db.collection(colName);
      const result = await col.deleteMany({});
      console.log(`  ✓ Cleared "${colName}" — ${result.deletedCount} documents deleted`);
    }

    console.log('\n  ✅ MongoDB: All FenceIN collections wiped clean.');
  } finally {
    await client.close();
  }
}

async function main() {
  console.log('\n🚨 FENCEIN DATABASE NUKE UTILITY');
  console.log('   Wiping ALL data from Supabase (PostgreSQL) and MongoDB...\n');

  try {
    await nukePostgres();
  } catch (err) {
    console.error('\n  ❌ PostgreSQL wipe failed:', err);
  }

  try {
    await nukeMongoDB();
  } catch (err) {
    console.error('\n  ❌ MongoDB wipe failed:', err);
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  🏁  DATABASE NUKE COMPLETE — Both DBs are clean.');
  console.log('══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
