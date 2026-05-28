const https = require('https');
const http = require('http');

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = mod.request(reqOpts, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, ok: res.statusCode < 300, json: () => JSON.parse(body) }); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
const fetch = fetchJSON;

const fs = require('fs');
const path = require('path');

async function testOnboarding() {
  console.log('=== STARTING MULTI-TENANT ONBOARDING VERIFICATION ===\n');

  let data1 = null;

  // Let's read the real face signature (base64 image) from disk
  const imgPath = path.join(__dirname, 'image.png');
  let faceImage = '';
  if (fs.existsSync(imgPath)) {
    faceImage = 'data:image/png;base64,' + fs.readFileSync(imgPath).toString('base64');
  } else {
    faceImage = 'data:image/jpeg;base64,' + Buffer.from('fake-face-signature').toString('base64');
  }

  // 1. Register Org 1
  const org1Payload = {
    orgName: 'Alpha Logistics II',
    orgType: 'Vendor',
    companyEmail: 'contact2@alpha.com',
    companyPhone: '+1 (555) 111-2222',
    companyAddress: '123 Alpha Way',
    expectedUserCount: 15,
    adminFirstName: 'Arthur',
    adminLastName: 'Pendragon',
    adminEmail: 'arthur2@alpha.com',
    adminPassword: 'SecurePassword123!',
    adminConfirmPassword: 'SecurePassword123!',
    faceImage: faceImage
  };

  console.log('Registering Organization 1: Alpha Logistics II...');
  try {
    const res1 = await fetch('http://localhost:3456/api/v1/auth/register-organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(org1Payload)
    });

    data1 = await res1.json();
    console.log('Response Status:', res1.status);
    console.log('Response Data:', JSON.stringify(data1, null, 2));

    if (res1.ok && data1.success) {
      console.log('✔ Organization 1 Registered successfully!');
      console.log('Generated Org Code:', data1.data.organizationId);
      console.log('Generated Super Admin ID:', data1.data.superAdminId);
    } else {
      console.error('❌ Failed to register Organization 1');
    }
  } catch (err) {
    console.error('❌ Network error registering Organization 1:', err.message);
  }

  console.log('\n----------------------------------------\n');

  // 2. Register Org 2 (to verify sequential IDs and unique isolation)
  const org2Payload = {
    orgName: 'Beta Security Group II',
    orgType: 'Subcontractor',
    companyEmail: 'ops2@betasec.com',
    companyPhone: '+1 (555) 222-3333',
    companyAddress: '456 Beta Blvd',
    expectedUserCount: 45,
    adminFirstName: 'Bruce',
    adminLastName: 'Wayne',
    adminEmail: 'bruce2@betasec.com',
    adminPassword: 'SecurePassword123!',
    adminConfirmPassword: 'SecurePassword123!',
    faceImage: faceImage
  };

  console.log('Registering Organization 2: Beta Security Group II...');
  try {
    const res2 = await fetch('http://localhost:3456/api/v1/auth/register-organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(org2Payload)
    });

    const data2 = await res2.json();
    console.log('Response Status:', res2.status);
    console.log('Response Data:', JSON.stringify(data2, null, 2));

    if (res2.ok && data2.success) {
      console.log('✔ Organization 2 Registered successfully!');
      console.log('Generated Org Code:', data2.data.organizationId);
      console.log('Generated Super Admin ID:', data2.data.superAdminId);
      
      // Verify auto-increment rule
      if (data1.data && data2.data) {
        const o1 = parseInt(data1.data.organizationId.replace('OG', ''));
        const o2 = parseInt(data2.data.organizationId.replace('OG', ''));
        const sa1 = parseInt(data1.data.superAdminId.replace('SA', ''));
        const sa2 = parseInt(data2.data.superAdminId.replace('SA', ''));
        
        console.log(`\nVerifying Seq Increments:`);
        console.log(`Org IDs: ${data1.data.organizationId} -> ${data2.data.organizationId} (Diff: ${o2 - o1})`);
        console.log(`Super Admin IDs: ${data1.data.superAdminId} -> ${data2.data.superAdminId} (Diff: ${sa2 - sa1})`);
        
        if (o2 > o1 && sa2 > sa1) {
          console.log('\n🏆 ALL AUTO-INCREMENT UNIQUE SEQUENCE TESTS PASSED! 🏆');
        } else {
          console.warn('\n⚠️ Increments did not match expected sequential order.');
        }
      }
    } else {
      console.error('❌ Failed to register Organization 2');
    }
  } catch (err) {
    console.error('❌ Network error registering Organization 2:', err.message);
  }

  console.log('\n=== END OF VERIFICATION ===');
}

testOnboarding();
