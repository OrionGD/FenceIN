import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('🔍 Querying PostgreSQL for nick.fury@fencein.app face embedding data...');

  const res = await pool.query(`
    SELECT 
      id, 
      email, 
      "faceRegistered", 
      "faceEmbedding"::text AS "faceEmbeddingRaw"
    FROM users 
    WHERE email = 'nick.fury@fencein.app'
  `);

  const record = res.rows[0];
  if (!record) {
    console.log('❌ Nick Fury record not found in the database.');
    return;
  }

  console.log('\n👤 User Profile:');
  console.log(`  - ID:             ${record.id}`);
  console.log(`  - Email:          ${record.email}`);
  console.log(`  - FaceRegistered: ${record.faceRegistered}`);
  
  if (record.faceEmbeddingRaw) {
    console.log('\n✅ Stored Face Embedding vector found (512-dimensional pgvector):');
    const vectorStr = record.faceEmbeddingRaw;
    console.log(`  - Raw Vector string: ${vectorStr.substring(0, 80)}...`);
    
    // Parse vector string (format: "[0.123, -0.456, ...]")
    const vectorArray = vectorStr
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map((val: string) => parseFloat(val.trim()));
      
    console.log(`  - Vector dimension count: ${vectorArray.length}`);
    console.log(`  - Vector elements (first 10):`, vectorArray.slice(0, 10));
  } else {
    console.log('\n⚠️ No Face Embedding vector found (currently NULL).');
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
