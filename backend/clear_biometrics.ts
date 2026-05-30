import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load DATABASE_URL from parent .env
let connectionString = process.env.DATABASE_URL;
let envPath = '';

if (typeof __dirname !== 'undefined') {
  envPath = path.resolve(__dirname, '../.env');
} else {
  envPath = path.resolve(process.cwd(), '.env');
}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/);
    if (match) {
      connectionString = match[1];
      console.log('Successfully loaded DATABASE_URL from parent .env.');
    }
  }
}

if (!connectionString) {
  console.error('DATABASE_URL is not set!');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  console.log('--- Biometric Purge Protocol (Raw SQL) Initiated ---');
  
  const client = await pool.connect();
  try {
    // 1. Wipe User table columns
    const resUsers = await client.query(`
      UPDATE users 
      SET "faceEmbedding" = NULL, 
          "fingerprintTemplate" = NULL, 
          "faceRegistered" = FALSE, 
          "fingerprintRegistered" = FALSE, 
          "biometricEnrolled" = FALSE, 
          "biometricPending" = TRUE
    `);
    console.log(`Successfully reset users table columns: ${resUsers.rowCount} rows updated.`);

    // 2. Clear user_biometrics table
    const resBiometrics = await client.query('DELETE FROM user_biometrics');
    console.log(`Successfully cleared user_biometrics table: ${resBiometrics.rowCount} rows deleted.`);

    // 3. Clear biometric_audit_log table
    const resAudit = await client.query('DELETE FROM biometric_audit_log');
    console.log(`Successfully cleared biometric_audit_log table: ${resAudit.rowCount} rows deleted.`);

    console.log('--- Biometric Purge Completed Successfully ---');
  } finally {
    client.release();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
