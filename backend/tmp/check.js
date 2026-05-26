const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const pg = require('pg');
const path = require('path');
const { PrismaPg } = require('@prisma/adapter-pg');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        faceEmbedding: true,
        fingerprintTemplate: true,
        isActive: true,
      }
    });

    console.log('--- USER DATABASE RECORDS ---');
    console.log(JSON.stringify(users, null, 2));
    console.log('-----------------------------');
  } catch (error) {
    console.error('Error reading users from database:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

check();
