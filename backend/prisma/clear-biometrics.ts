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
  console.log('🔄 Initiating biometric reset protocol...');

  const updateResult = await prisma.user.updateMany({
    data: {
      faceRegistered: false,
      fingerprintRegistered: false,
      biometricEnrolled: false,
      biometricPending: true,
      fingerprintTemplate: null,
    }
  });

  await prisma.$executeRawUnsafe(
    `UPDATE users SET "faceEmbedding" = NULL`
  );

  console.log(`✅ Successfully reset biometric profiles for all ${updateResult.count} users in the database!`);
  console.log('🎉 Reset complete. You can now scan your actual face on the login screen!');
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
