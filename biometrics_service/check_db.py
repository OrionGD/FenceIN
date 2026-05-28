import psycopg2
import os
import re

def load_dotenv():
    paths = [".env", "../.env", "../../.env", "biometrics_service/.env"]
    for path in paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    m = re.match(r"^([^=]+)=(.*)$", line)
                    if m:
                        key = m.group(1).strip().strip("'\"")
                        val = m.group(2).strip().strip("'\"")
                        os.environ[key] = val
            break

load_dotenv()
db_url = os.environ.get("DATABASE_URL")
print("DATABASE_URL:", db_url)

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='User' AND column_name='faceEmbedding';")
print("faceEmbedding column info:", cur.fetchall())

# Let's also check if there are other columns, or let's select one value to see the type
cur.execute("SELECT \"faceEmbedding\" FROM \"User\" WHERE \"faceEmbedding\" IS NOT NULL LIMIT 1;")
row = cur.fetchone()
if row:
    print("faceEmbedding value:", row[0][:100] if row[0] else None)

# Let's check detail on pgvector type if any
cur.execute("SELECT atttypmod FROM pg_attribute WHERE attrelid = '\"User\"'::regclass AND attname = 'faceEmbedding';")
print("atttypmod:", cur.fetchone())
conn.close()
