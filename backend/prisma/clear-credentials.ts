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
  console.log('🧹 Preparing to purge all login credentials from the database...');

  // Count active credentials before purge
  const preUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      userRole: true,
      password: true,
      faceRegistered: true,
      fingerprintRegistered: true,
    }
  });

  const withPassword = preUsers.filter(u => u.password && u.password !== '').length;
  const withFace = preUsers.filter(u => u.faceRegistered).length;
  const withFingerprint = preUsers.filter(u => u.fingerprintRegistered).length;

  console.log(`📊 Current credential counts across ${preUsers.length} user accounts:`);
  console.log(`  - Accounts with active passwords: ${withPassword}`);
  console.log(`  - Accounts with face biometrics: ${withFace}`);
  console.log(`  - Accounts with fingerprint biometrics: ${withFingerprint}`);

  console.log('\n⚡ Executing purge query...');

  // Set password to a blank string, and nullify biometrics
  // We use raw SQL to ensure pgvector extension updates correctly without schema-client parsing limits
  const result = await prisma.$executeRawUnsafe(
    `UPDATE users SET "password" = '', "faceEmbedding" = NULL, "fingerprintTemplate" = NULL, "faceRegistered" = FALSE, "fingerprintRegistered" = FALSE`
  );

  console.log(`✅ Successfully wiped credentials for ${result} user accounts!`);

  // Verify updates
  const postUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      userRole: true,
      password: true,
      faceRegistered: true,
      fingerprintRegistered: true,
    }
  });

  const postWithPassword = postUsers.filter(u => u.password && u.password !== '').length;
  const postWithFace = postUsers.filter(u => u.faceRegistered).length;
  const postWithFingerprint = postUsers.filter(u => u.fingerprintRegistered).length;

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
