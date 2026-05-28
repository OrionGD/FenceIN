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
  console.log('🔍 Querying PostgreSQL database to inspect user and biometric records...');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      userRole: true,
      state: true,
      faceRegistered: true,
      fingerprintRegistered: true,
      tenantId: true,
      createdAt: true
    }
  });

  console.log(`\n📊 Total User Records Found: ${users.length}\n`);

  users.forEach((u, i) => {
    console.log(`--------------------------------------------------`);
    console.log(`👤 User #${i + 1}: ${u.firstName} ${u.lastName}`);
    console.log(`--------------------------------------------------`);
    console.log(`  - ID:                   ${u.id}`);
    console.log(`  - Email:                ${u.email}`);
    console.log(`  - Role:                 ${u.userRole}`);
    console.log(`  - State:                ${u.state}`);
    console.log(`  - Tenant ID:            ${u.tenantId || '❌ NONE'}`);
    console.log(`  - Face Embedding:       ${u.faceRegistered ? '✅ STORED (pgvector)' : '❌ EMPTY'}`);
    console.log(`  - Fingerprint Template: ${u.fingerprintRegistered ? '✅ STORED' : '❌ EMPTY'}`);
    console.log(`  - Created At:           ${u.createdAt}`);
  });
  console.log(`--------------------------------------------------`);
}

main()
  .catch((e) => {
    console.error('❌ Diagnostic query failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
