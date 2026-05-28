import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

// Locate .env dynamically
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

// Standard CSV line parser that handles quoted columns
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Locate CSV file dynamically
const findCsv = () => {
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const p1 = path.join(dir, 'docs', 'datasest.csv');
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(dir, '..', 'docs', 'datasest.csv');
    if (fs.existsSync(p2)) return p2;
    dir = path.dirname(dir);
  }
  return undefined;
};

async function main() {
  console.log('🚀 Starting FenceIN Enterprise Dataset Seeder...');
  
  const csvFilePath = findCsv();
  if (!csvFilePath) {
    throw new Error('❌ Could not find docs/datasest.csv file!');
  }
  console.log(`📂 CSV File Located: ${csvFilePath}`);

  const content = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('❌ CSV file has no records!');
  }

  // Parse header
  const headerCols = parseCsvLine(lines[0]);
  console.log('📋 CSV Columns parsed:', headerCols);

  const records: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length !== headerCols.length) {
      console.warn(`⚠️ Warning: Row #${i} has columns count mismatch (${cols.length} vs ${headerCols.length}). Skipping.`);
      continue;
    }
    const record: any = {};
    for (let j = 0; j < headerCols.length; j++) {
      record[headerCols[j]] = cols[j];
    }
    records.push(record);
  }
  console.log(`📊 Successfully parsed ${records.length} user records from CSV.`);

  // 1. Database Full Wipe for pristine state (to clear SA001-SA005 conflicts from previous test runs)
  console.log('\n🧹 Performing full database wipe to prepare for fresh Enterprise dataset seed...');

  const attendanceDeleteResult = await prisma.attendance.deleteMany();
  console.log(`  🗑️ Deleted ${attendanceDeleteResult.count} Attendance records.`);

  const workerSiteDeleteResult = await prisma.workerSite.deleteMany();
  console.log(`  🗑️ Deleted ${workerSiteDeleteResult.count} WorkerSite assignments.`);

  const kioskDeleteResult = await prisma.kiosk.deleteMany();
  console.log(`  🗑️ Deleted ${kioskDeleteResult.count} Kiosks.`);

  const incidentDeleteResult = await prisma.incident.deleteMany();
  console.log(`  🗑️ Deleted ${incidentDeleteResult.count} Incident logs.`);

  const vendorDeleteResult = await prisma.vendor.deleteMany();
  console.log(`  🗑️ Deleted ${vendorDeleteResult.count} Vendor entities.`);

  const userDeleteResult = await prisma.user.deleteMany();
  console.log(`  🗑️ Deleted ${userDeleteResult.count} User accounts.`);

  const siteDeleteResult = await prisma.site.deleteMany();
  console.log(`  🗑️ Deleted ${siteDeleteResult.count} Sites.`);

  const shiftDeleteResult = await prisma.shift.deleteMany();
  console.log(`  🗑️ Deleted ${shiftDeleteResult.count} Shifts.`);

  const tenantDeleteResult = await prisma.tenant.deleteMany();
  console.log(`  🗑️ Deleted ${tenantDeleteResult.count} Tenant organizations.`);

  console.log('✨ Cleanup complete. Starting Database Seeding...\n');

  // 2. Create the two Tenants
  console.log('🏢 Seeding Organization Tenant records (SHIELD and ARGUS)...');
  await prisma.tenant.createMany({
    data: [
      {
        id: 'ORG001',
        name: 'SHIELD',
        slug: 'shield',
        organizationCode: 'ORG001',
        plan: 'STANDARD',
        companyEmail: 'ops@shield.gov',
        companyPhone: '+19875048680',
        companyAddress: 'SHIELD HQ, Triskelion',
      },
      {
        id: 'ORG002',
        name: 'ARGUS',
        slug: 'argus',
        organizationCode: 'ORG002',
        plan: 'STANDARD',
        companyEmail: 'ops@argus.gov',
        companyPhone: '+19889898158',
        companyAddress: 'ARGUS HQ, Washington D.C.',
      }
    ]
  });
  console.log('✅ Tenants ORG001 and ORG002 successfully established.');

  // 3. Separate Workers from Non-Workers to maintain perfect hierarchy
  const nonWorkers = records.filter(r => parseInt(r.roleLevel, 10) < 6);
  const workers = records.filter(r => parseInt(r.roleLevel, 10) === 6);

  // Sort non-workers by roleLevel (1 to 5) so that supervisors and managers are created before the users reporting to them
  nonWorkers.sort((a, b) => parseInt(a.roleLevel, 10) - parseInt(b.roleLevel, 10));

  console.log(`\n🔑 Processing and Hashing Passwords for ${records.length} accounts...`);
  // Map to hold user_id -> database UUID mapping to verify or connect relationships
  const userIdToUuidMap = new Map<string, string>();

  // 4. Seed Non-Worker Users (SUPER_ADMIN, ORG_ADMIN, SUPERVISOR, SECURITY_OFFICER, VENDOR_MANAGER)
  console.log(`⚙️ Seeding ${nonWorkers.length} Non-Worker users...`);
  for (const r of nonWorkers) {
    const roleLevel = parseInt(r.roleLevel, 10);
    const hashedPassword = await bcrypt.hash(r.password, 10);
    
    // Cleanup reportsTo for SUPER_ADMINS
    const reportsToVal = (r.reportsTo === 'ORG001' || r.reportsTo === 'ORG002') ? null : r.reportsTo;

    const user = await prisma.user.create({
      data: {
        roleLevel,
        user_id: r.user_id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        password: hashedPassword,
        tenantName: r.tenantName,
        tenantId: r.tenantId,
        userRole: r.userRole,
        reportsTo: reportsToVal,
        state: r.state || 'ACTIVE',
        phone: r.phone || null,
        govId: r.govId || null,
        bloodGroup: r.bloodGroup || null,
        address: r.address || null,
        skillType: r.skillType || null,
        shiftId: r.shiftId || null,
        isActive: r.isActive.toUpperCase() === 'TRUE',
        mustChangePassword: r.mustChangePassword.toUpperCase() === 'TRUE',
        faceRegistered: false,
        fingerprintRegistered: false,
      }
    });

    userIdToUuidMap.set(r.user_id, user.id);

    // If role is VENDOR_MANAGER, immediately establish the Vendor mapping
    if (r.userRole === 'VENDOR_MANAGER') {
      await prisma.vendor.create({
        data: {
          id: r.user_id, // e.g. VN001
          companyName: `${r.firstName} ${r.lastName}`,
          contactEmail: r.email,
          contactPhone: r.phone || null,
          managerId: user.id,
          tenantId: r.tenantId
        }
      });
      console.log(`🏢 Created Vendor mapping for: ${r.firstName} ${r.lastName} (${r.user_id})`);
    }
  }
  console.log('✅ All Non-Worker administrative and management accounts successfully created.');

  // 5. Seed Worker Users (roleLevel = 6)
  console.log(`\n👷 Seeding ${workers.length} Worker accounts...`);
  for (const r of workers) {
    const roleLevel = parseInt(r.roleLevel, 10);
    const hashedPassword = await bcrypt.hash(r.password, 10);

    const user = await prisma.user.create({
      data: {
        roleLevel,
        user_id: r.user_id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        password: hashedPassword,
        tenantName: r.tenantName,
        tenantId: r.tenantId,
        userRole: r.userRole,
        reportsTo: r.reportsTo || null,
        state: r.state || 'ACTIVE',
        phone: r.phone || null,
        govId: r.govId || null,
        bloodGroup: r.bloodGroup || null,
        address: r.address || null,
        skillType: r.skillType || null,
        shiftId: r.shiftId || null,
        vendorId: r.vendorId || null, // Connects to Vendor.id which matches the CSV value (e.g. VN001)
        isActive: r.isActive.toUpperCase() === 'TRUE',
        mustChangePassword: r.mustChangePassword.toUpperCase() === 'TRUE',
        faceRegistered: false,
        fingerprintRegistered: false,
      }
    });

    userIdToUuidMap.set(r.user_id, user.id);
  }
  console.log('✅ All Worker records successfully established with direct Vendor relationships.');

  // Double Check Count
  const finalUserCount = await prisma.user.count();
  console.log(`\n🎉 Verification Passed: Seeded ${finalUserCount} users across ORG001 and ORG002 successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Data upload process encountered an error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
