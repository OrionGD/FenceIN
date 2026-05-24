import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const users = [
    { email: 'superadmin@fencein.app', role: Role.SUPER_ADMIN, firstName: 'Super', lastName: 'Admin' },
    { email: 'orgadmin@fencein.app', role: Role.ORG_ADMIN, firstName: 'Org', lastName: 'Admin' },
    { email: 'hr@fencein.app', role: Role.HR_ADMIN, firstName: 'HR', lastName: 'Admin' },
    { email: 'supervisor@fencein.app', role: Role.SUPERVISOR, firstName: 'Workforce', lastName: 'Supervisor' },
    { email: 'security@fencein.app', role: Role.SECURITY_OFFICER, firstName: 'Security', lastName: 'Officer' },
    { email: 'vendor@fencein.app', role: Role.VENDOR_MANAGER, firstName: 'Vendor', lastName: 'Manager' },
    { email: 'worker@fencein.app', role: Role.WORKER, firstName: 'Contract', lastName: 'Worker' },
  ];

  for (const u of users) {
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
    console.log(`Seeded ${u.role}: ${user.email} / admin123`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
