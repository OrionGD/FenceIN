import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

async function main() {
  const client = await pool.connect();
  try {
    console.log('⚡ Creating ivfflat index on "users" table for "faceEmbedding"...');
    
    // We drop the index if it exists, then recreate it.
    await client.query('DROP INDEX IF EXISTS face_embedding_idx;');
    
    await client.query(`
      CREATE INDEX face_embedding_idx
      ON users
      USING ivfflat ("faceEmbedding" vector_cosine_ops)
      WITH (lists = 100);
    `);
    
    console.log('✅ ivfflat index "face_embedding_idx" created successfully!');
  } catch (err) {
    console.error('❌ Failed to create ivfflat index:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
