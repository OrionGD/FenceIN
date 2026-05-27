import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

    const auditCount = await prisma.auditLog.deleteMany();
    console.log(`  - Deleted ${auditCount.count} audit logs.`);

    const vendorCount = await prisma.vendor.deleteMany();
    console.log(`  - Deleted ${vendorCount.count} vendors.`);

    const userCount = await prisma.user.deleteMany();
    console.log(`  - Deleted ${userCount.count} users.`);

    const siteCount = await prisma.site.deleteMany();
    console.log(`  - Deleted ${siteCount.count} sites.`);

    const shiftCount = await prisma.shift.deleteMany();
    console.log(`  - Deleted ${shiftCount.count} shifts.`);

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
