import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import pg from 'pg';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Purging all old accounts, biometrics, logs, and mapping records for clean development state...');
  try {
    await prisma.attendance.deleteMany();
    await prisma.workerSite.deleteMany();
    await prisma.kiosk.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();
    await prisma.site.deleteMany();
    console.log('✨ Clean slate achieved! All database entries successfully purged.');
    console.log('ℹ️ Pure database purge mode: skipped all user/vendor insertions to allow 100% manual provisioning.');
    return;
  } catch (err) {
    console.log('⚠️ Database purge skipped (or tables do not exist yet):', err);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding process encountered an error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
