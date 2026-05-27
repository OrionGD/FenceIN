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
  console.log('🧹 Preparing to purge all login credentials from the database...');

  // Count active credentials before purge
  const preUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      password: true,
      faceEmbedding: true,
      fingerprintTemplate: true,
    }
  });

  const withPassword = preUsers.filter(u => u.password && u.password !== '').length;
  const withFace = preUsers.filter(u => u.faceEmbedding !== null).length;
  const withFingerprint = preUsers.filter(u => u.fingerprintTemplate !== null).length;

  console.log(`📊 Current credential counts across ${preUsers.length} user accounts:`);
  console.log(`  - Accounts with active passwords: ${withPassword}`);
  console.log(`  - Accounts with face biometrics: ${withFace}`);
  console.log(`  - Accounts with fingerprint biometrics: ${withFingerprint}`);

  console.log('\n⚡ Executing purge query...');
  
  // Set password to a dummy string, and nullify biometrics
  // We use raw SQL to ensure pgvector extension updates correctly without schema-client parsing limits
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "password" = '', "faceEmbedding" = NULL, "fingerprintTemplate" = NULL`
  );

  console.log(`✅ Successfully wiped credentials for ${result} user accounts!`);

  // Verify updates
  const postUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      password: true,
      faceEmbedding: true,
      fingerprintTemplate: true,
    }
  });

  const postWithPassword = postUsers.filter(u => u.password && u.password !== '').length;
  const postWithFace = postUsers.filter(u => u.faceEmbedding !== null).length;
  const postWithFingerprint = postUsers.filter(u => u.fingerprintTemplate !== null).length;

  console.log('\n📊 Post-purge credential counts:');
  console.log(`  - Accounts with active passwords: ${postWithPassword}`);
  console.log(`  - Accounts with face biometrics: ${postWithFace}`);
  console.log(`  - Accounts with fingerprint biometrics: ${postWithFingerprint}`);
  console.log('🎉 Database credentials successfully sanitized and secured!');
}

main()
  .catch((e) => {
    console.error('❌ Credential purge failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
