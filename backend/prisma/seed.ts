import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: '../.env' });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword) {
    console.log('⚠️ SEED_ADMIN_PASSWORD not set in .env. Skipping database seeding to preserve security.');
    return;
  }

  const hashedPassword = await bcrypt.hash(seedPassword, 10);
  
  // Dynamically resolve seeded users from environment variables rather than hardcoding credentials
  const users = [
    { email: process.env.SEED_SUPERADMIN_EMAIL, role: Role.SUPER_ADMIN, firstName: 'Super', lastName: 'Admin' },
    { email: process.env.SEED_ORGADMIN_EMAIL, role: Role.ORG_ADMIN, firstName: 'Org', lastName: 'Admin' },
    { email: process.env.SEED_HRADMIN_EMAIL, role: Role.HR_ADMIN, firstName: 'HR', lastName: 'Admin' },
    { email: process.env.SEED_SUPERVISOR_EMAIL, role: Role.SUPERVISOR, firstName: 'Workforce', lastName: 'Supervisor' },
    { email: process.env.SEED_SECURITY_EMAIL, role: Role.SECURITY_OFFICER, firstName: 'Security', lastName: 'Officer' },
    { email: process.env.SEED_VENDOR_EMAIL, role: Role.VENDOR_MANAGER, firstName: 'Vendor', lastName: 'Manager' },
    { email: process.env.SEED_WORKER_EMAIL, role: Role.WORKER, firstName: 'Contract', lastName: 'Worker' },
  ];

  for (const u of users) {
    if (!u.email) {
      console.log(`⚠️ Missing email config for role ${u.role}. Skipping this seed entry.`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
      },
    });
    console.log(`✅ Seeded role ${u.role} securely from environment settings.`);
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
