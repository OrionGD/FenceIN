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
  console.log('🔍 Querying PostgreSQL database to inspect user and biometric records...');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      state: true,
      faceEmbedding: true,
      fingerprintTemplate: true,
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
    console.log(`  - Role:                 ${u.role}`);
    console.log(`  - State:                ${u.state}`);
    console.log(`  - Face Embedding:       ${u.faceEmbedding ? '✅ STORED (128D Neural Vector)' : '❌ EMPTY'}`);
    console.log(`  - Fingerprint Template: ${u.fingerprintTemplate ? '✅ STORED (ORB Minutiae Template)' : '❌ EMPTY'}`);
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
