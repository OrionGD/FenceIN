import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
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

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Purging all corporate data, users, and biometrics from PostgreSQL...');
  
  try {
    const attendanceCount = await prisma.attendance.deleteMany();
    console.log(`  - Deleted ${attendanceCount.count} attendance logs.`);

    const workerSiteCount = await prisma.workerSite.deleteMany();
    console.log(`  - Deleted ${workerSiteCount.count} worker-to-site assignments.`);

    const kioskCount = await prisma.kiosk.deleteMany();
    console.log(`  - Deleted ${kioskCount.count} kiosks.`);

    const incidentCount = await prisma.incident.deleteMany();
    console.log(`  - Deleted ${incidentCount.count} incidents.`);

    const vendorCount = await prisma.vendor.deleteMany();
    console.log(`  - Deleted ${vendorCount.count} vendors.`);

    const userCount = await prisma.user.deleteMany();
    console.log(`  - Deleted ${userCount.count} users.`);

    const siteCount = await prisma.site.deleteMany();
    console.log(`  - Deleted ${siteCount.count} sites.`);

    const shiftCount = await prisma.shift.deleteMany();
    console.log(`  - Deleted ${shiftCount.count} shifts.`);

    const tenantCount = await prisma.tenant.deleteMany();
    console.log(`  - Deleted ${tenantCount.count} tenants.`);

    console.log('✨ All tables successfully wiped. Clean database achieved!');
  } catch (err) {
    console.error('❌ Error executing database wipe:', err);
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
