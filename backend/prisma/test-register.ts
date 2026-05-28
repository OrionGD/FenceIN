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
  console.log('🧪 Simulating user registration with mock biometrics...');

  // 1. Setup mock data
  const registerDto = {
    email: 'diagnostics@fencein.app',
    password: 'Password123!',
    firstName: 'Diag',
    lastName: 'Test',
    faceEmbedding: Array.from({ length: 512 }, () => Math.random()),
    fingerprintTemplate: 'mock_fingerprint_template_data',
    role: 'WORKER',
  };

  try {
    // Check if duplicate user
    console.log('Checking existing user...');
    const existingUser = await prisma.user.findUnique({ where: { email: registerDto.email } });
    console.log('Existing user check passed. Result:', existingUser);

    // Prevent duplicate biometric registrations
    console.log('Checking duplicate biometrics...');
    const vectorString = `[${registerDto.faceEmbedding.join(',')}]`;

    // Attempting query
    const duplicateFace: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, 1 - ("faceEmbedding"::vector <=> $1::vector) AS confidence
      FROM users
      WHERE "faceEmbedding" IS NOT NULL
      ORDER BY "faceEmbedding"::vector <=> $1::vector
      LIMIT 1;
    `, vectorString);
    console.log('Face biometric duplicate check completed. Results:', duplicateFace);

    // Attempting user creation
    console.log('Attempting Prisma User creation...');
    const user = await prisma.user.create({
      data: {
        email: registerDto.email,
        password: 'hashed_password_placeholder',
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        userRole: registerDto.role,
        roleLevel: 6,
        user_id: 'USR_DIAGTEST123',
        tenantId: 'ORG001',
        tenantName: 'SHIELD',
      }
    });
    console.log('✅ User created successfully!', user);

    // Storing biometrics
    console.log('Updating face embedding with raw SQL...');
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "faceEmbedding" = $1::vector WHERE id = $2`,
      vectorString,
      user.id
    );
    console.log('✅ Face embedding updated successfully!');

    // Cleanup
    console.log('Cleaning up diagnostic user...');
    await prisma.user.delete({ where: { id: user.id } });
    console.log('🧹 Cleanup complete.');

  } catch (err: any) {
    console.error('❌ Diagnostic Error Caught:');
    console.error(err);
    if (err.message) console.error('Message:', err.message);
    if (err.code) console.error('Prisma Code:', err.code);
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
