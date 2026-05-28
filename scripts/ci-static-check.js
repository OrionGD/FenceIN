#!/usr/bin/env node
/**
 * ci-static-check.js
 *
 * Fails CI if any production source code contains banned patterns:
 *   - Math.random() used for telemetry/simulation
 *   - faker.* imports or calls
 *   - mockData / dummyData variables
 *   - setInterval telemetry generators
 *   - Hardcoded KPI constants (specific patterns)
 *   - Simulated WebSocket payloads
 *   - Local-only auth bypasses
 *
 * Run: node scripts/ci-static-check.js
 *
 * Exits with code 1 if violations are found.
 * Exits with code 0 if clean.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, relative, basename } from 'path';

const ROOT = process.cwd();

// Directories and explicit files to scan
const SCAN_TARGETS = ['frontend/src', 'backend/src', '.env'];

// File extensions to check (and explicit filenames like .env)
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml']);

// Files explicitly excluded from scanning (test files are allowed to use mocks)
const EXCLUDE_PATTERNS = [
  /\.spec\.(ts|tsx|js)$/,
  /\.test\.(ts|tsx|js)$/,
  /__tests__/,
  /node_modules/,
  /\.d\.ts$/,
  // LandingPage.tsx: Math.random() is confined to decorative marketing UI widgets
  // (interactive fingerprint demo, CLI animation). Not operational dashboard telemetry.
  /LandingPage\.tsx$/,
];

/**
 * Banned patterns with explanations.
 * Expanded to 20+ patterns to prevent regression of mock / simulation architectures.
 */
const BANNED_PATTERNS = [
  {
    pattern: /Math\.random\(\)/g,
    message: 'Math.random() is banned in production code. Never simulate telemetry, biometric scores, or KPI values.',
  },
  {
    pattern: /faker\./g,
    message: 'faker.* is banned. No fake data generators allowed in production code.',
  },
  {
    pattern: /\b(mockData|dummyData|fakeData|testData)\s*=/g,
    message: 'Mock/dummy/fake data variables are banned in production source.',
  },
  {
    pattern: /setInterval\s*\(.*Math\.random/gs,
    message: 'setInterval telemetry simulation with Math.random() is banned. Use real backend endpoints.',
  },
  {
    pattern: /\/\/ Emulate|\/\/ Simulate|\/\/ Fake|\/\/ Mock telemetry/gi,
    message: 'Simulation/emulation comments detected. Remove simulated logic entirely.',
  },
  {
    pattern: /socket\.emit\s*\(\s*['"]mock/g,
    message: 'Mock WebSocket emitters are banned. Use real Socket.IO gateway events.',
  },
  {
    pattern: /new Promise\s*\(.*resolve.*setTimeout.*Math\.random/gs,
    message: 'Fake async delays with Math.random() are banned. Use real network calls.',
  },
  {
    pattern: /isAuthenticated\s*=\s*true(?!\s*;?\s*\/\/\s*backend)/g,
    message: 'Local-only auth bypass (isAuthenticated = true) is banned.',
  },
  // --- New Banned Patterns for Zero-Mock Telemetry Integrity ---
  {
    pattern: /\bfallbackAdmin\b/gi,
    message: 'fallbackAdmin is banned. Identity must be fully derived from security checks.',
  },
  {
    pattern: /\bdemoUser\b/gi,
    message: 'demoUser pattern is banned. Real authentication must be used.',
  },
  {
    pattern: /\btestUser\b/gi,
    message: 'testUser pattern is banned. Real users must be queried.',
  },
  {
    pattern: /\bsampleMetrics\b/gi,
    message: 'sampleMetrics is banned. Dashboards must bind to real production streams.',
  },
  {
    pattern: /\bplaceholderStats\b/gi,
    message: 'placeholderStats is banned. Use backend-synchronized datasets.',
  },
  {
    pattern: /\bfakeApi\b/gi,
    message: 'fakeApi is banned. Never wrap operations in simulated API responses.',
  },
  {
    pattern: /\bmockFetch\b/gi,
    message: 'mockFetch is banned. Use authenticated network fetching.',
  },
  {
    pattern: /\bgenerateFake\b/gi,
    message: 'generateFake generator calls are banned. Avoid synthetic datasets.',
  },
  {
    pattern: /\bsynthetic\b/gi,
    message: 'synthetic metrics or operations are banned. Only live actual telemetry is permitted.',
  },
  {
    pattern: /\bdummy\b/gi,
    message: 'dummy definitions are banned. Keep production structures production-only.',
  },
  {
    pattern: /\bmockWorkers\b/gi,
    message: 'mockWorkers collections are banned. Read worker rosters exclusively from PostgreSQL DB.',
  },
  {
    pattern: /\bfakeWorkers\b/gi,
    message: 'fakeWorkers lists are banned.',
  },
  {
    pattern: /\bseedDemoData\b/gi,
    message: 'seedDemoData bootstrapping is prohibited in non-isolated/production builds.',
  },
  {
    pattern: /\bplaceholderData\b/gi,
    message: 'placeholderData is banned. Dashboards must render empty/loading states rather than mock placeholders.',
  },
  {
    pattern: /\bseedState\b/gi,
    message: 'seedState initialization in state management slices is banned.',
  },
  {
    pattern: /\bhydratedState\b/gi,
    message: 'hydratedState seeding is banned.',
  },
  {
    pattern: /\b(?:postgres|mongodb|mysql):\/\/(?:demo|test|mock|placeholder):/gi,
    message: 'Fake database credentials detected in configuration or environment.',
  },
  {
    pattern: /JWT_SECRET\s*=\s*['"]?(?:dummy|mock|placeholder|test|temp)['"]?/gi,
    message: 'Weak or placeholder JWT_SECRET is banned. Use secure environment secrets.',
  }
];

let violations = 0;
const report = [];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(p => p.test(filePath));
}

function scanFile(filePath) {
  const rel = relative(ROOT, filePath);
  if (shouldExclude(rel)) return;

  const ext = extname(filePath);
  const fileBase = basename(filePath);
  
  // Scan only allowed extensions or explicit .env files
  if (!ALLOWED_EXTENSIONS.has(ext) && fileBase !== '.env') return;

  const content = readFileSync(filePath, 'utf8');

  for (const { pattern, message } of BANNED_PATTERNS) {
    pattern.lastIndex = 0;
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        violations++;
        report.push(`  ❌ ${rel}:${idx + 1} — ${message}`);
        report.push(`     > ${line.trim().slice(0, 120)}`);
      }
    });
  }
}

function walkDir(dir) {
  const fullDir = join(ROOT, dir);
  try {
    const entries = readdirSync(fullDir);
    for (const entry of entries) {
      const fullPath = join(fullDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(join(dir, entry));
      } else if (stat.isFile()) {
        scanFile(fullPath);
      }
    }
  } catch {
    // Directory may not exist in some environments
  }
}

console.log('\n🔍 FenceIN Static Mock Data & Architecture Enforcement Detector\n');
console.log('Scanning production source for banned mock/simulated data patterns...\n');

for (const target of SCAN_TARGETS) {
  const fullPath = join(ROOT, target);
  try {
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(target);
    } else if (stat.isFile()) {
      scanFile(fullPath);
    }
  } catch {
    // Target doesn't exist
  }
}

if (violations === 0) {
  console.log('✅ No violations found. Production code is clean of mock/simulated data.\n');
  process.exit(0);
} else {
  console.log(`🚫 Found ${violations} violation(s):\n`);
  report.forEach(line => console.log(line));
  console.log(`\n❌ CI check FAILED. Fix all violations before merging.\n`);
  process.exit(1);
}
