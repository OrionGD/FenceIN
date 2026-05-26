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
  console.log('🔄 Initiating biometric reset protocol...');
  
  const emails = [
    process.env.SEED_SUPERADMIN_EMAIL,
    process.env.SEED_ORGADMIN_EMAIL,
    process.env.SEED_HRADMIN_EMAIL,
    process.env.SEED_SUPERVISOR_EMAIL,
    process.env.SEED_SECURITY_EMAIL,
    process.env.SEED_VENDOR_EMAIL,
    process.env.SEED_WORKER_EMAIL,
  ].filter(Boolean);

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "faceEmbedding" = NULL WHERE id = $1`,
        user.id
      );
      console.log(`✅ Cleared biometric profile for: ${email}. Ready for webcam enrollment!`);
    }
  }
  
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
