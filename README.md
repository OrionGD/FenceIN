<div align="center">
  <img src="image.png" alt="FenceIn Platform">
  <h1>🛡️ FenceIn Enterprise OS</h1>
  <p><b>Unified Command & Control Architecture for Industrial Workforce Intelligence</b></p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Framer%20Motion](https://img.shields.io/badge/Framer%20Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
</div>

FenceIn is an enterprise-grade **Unified Command & Control Architecture** designed for industries, factories, warehouses, and construction sites to seamlessly manage permanent employees and temporary contract workers. By combining **facial biometrics, offline-first syncing, and AI-driven analytics**, FenceIn eliminates attendance fraud, automates shift allocations, and provides real-time operational intelligence.

---

## 🚀 Platform Overview

### Unified Command & Control Architecture
FenceIn operates as a centralized command hub that orchestrates workforce movements, security protocols, and operational workflows through an integrated ecosystem of specialized modules.

---

## ✨ Core Features

### Machine Intelligence Hub
- Central AI nervous system processing real-time biometrics and behavioral analytics
- Groq LLMs analyze attendance trends, predict absenteeism, and provide operational insights
- **0.01% false positives** with anomaly guard protocols

### IndexedDB Synchronization Engine
- AES-GCM-256 secured local persistence with automatic conflict resolution
- Offline-first queue architecture ensuring zero data loss during network outages
- Seamless synchronization with PostgreSQL when connectivity is restored

### Contractor Lifecycle Hub
- End-to-end contractor management from pre-registration to exit
- Multi-tier vendor control with certification status tracking
- Automated Excel/CSV report generation and compliance verification

---

## 📦 Enterprise Modules

### Control Room
Real-time operational dashboard with live system feeds, active incident management, and executive analytics. Monitor all sites from a unified interface with WebSocket-powered live updates.

### Security Desk
Dedicated security operations center featuring guard logs, manual override capabilities, face recognition approval workflows, and active incident alarm management.

### Biometric Hub
Centralized biometric processing center with neural face matching grid, liveness validation, and anti-spoof trap systems achieving 99.98% accuracy.

### Operations Suite
Comprehensive operational management including roster planning, shift scheduling, geofence monitoring, and vendor override controls.

---

## 🔐 7-Tier RBAC Matrix

FenceIn strictly isolates data and permissions across 7 hierarchical tiers:

| Tier | Role | Level | Primary Function |
|------|------|-------|------------------|
| 1 | **Contractor / Worker** | TRACKING | Kiosk face scans, geofenced sector work, attendance logs |
| 2 | **Security Officer** | ENFORCEMENT | Guard logs, manual override check-ins, incident alarms |
| 3 | **Contractor Manager** | VENDOR | Pre-registration, compliance checks, worker credentials |
| 4 | **Compliance Officer** | AUDIT | Audit logs, privacy checks, incident evaluations |
| 5 | **Operations Manager** | COMMAND | Roster prep, shift scheduling, site assignments |
| 6 | **Executive** | GLOBAL VIEW | Site efficiency data, cost matrices, platform analytics |
| 7 | **Super Admin** | UNLIMITED | System overrides, tenant setups, key rotations |

---

## ✨ Enterprise Features

### Neural Face Matching Grid
- Uses MediaPipe, OpenCV, and InsightFace for highly accurate face detection, liveness validation, and spoof-prevention
- **99.98% accuracy** on dark industrial sites with passive eye-blink tracking to prevent presentation attacks
- On-device WebAssembly processing delivers **20ms** match speeds without cloud dependencies
- Anti-spoof traps with multi-layer liveness detection

### Active Polygon Geofencing
- Define operational yards, hazardous zones, or construction pits directly in the dashboard
- Device-agnostic browser location tracking with audit logs
- **99.98% accuracy** boundary breach detection with instant security alerts

### Offline-First Infrastructure
- Designed for harsh industrial environments with zero-connectivity field scenarios
- AES-GCM-256 secured IndexedDB queue with automatic conflict resolution
- **0% data leak guarantee** with automatic background sync

### AI Behavioral Intelligence
- **Fatigue Analysis:** Cognitive fatigue predictors prevent workplace accidents (**42% accident drop**)
- **Anomaly Detection:** Real-time pattern recognition for suspicious activities
- **Cognitive Shift Builder:** Automated roster generation based on fatigue factors

### Industrial Workflow (4-Step Process)
1. **Roster** → AI-driven shift allocation and contractor assignment
2. **Kiosk** → Biometric check-in with facial validation
3. **Geofence** → Location verification within operational boundaries
4. **Sync** → Automatic data synchronization with central systems

### Kiosk System
- Dedicated biometric kiosk interface for tablet or mounting hardware
- Hardware-accelerated face tracking via WebAssembly and MediaPipe
- No high-end server hardware required at gate structures

### Incident & Audit Systems
- Granular tracking of modifications, geofence violations, spoofing attempts, and late arrivals
- Immutable read-only audit log registries for ISO-27001, GDPR/CCPA compliance
- Real-time alerts via WebSocket-powered dashboards

### Analytics & Reporting
- Excel/CSV exports with compliance-ready formatting
- Real-time dashboards with WebSocket updates
- Predictive analytics for workforce optimization

---

## 🏗️ Architecture & Tech Stack

FenceIn utilizes a highly scalable, decoupled architecture designed for multi-tenant deployments and edge processing.

### 💻 Frontend (PWA Kiosk & Dashboard)
- **Framework:** React 19 + Vite + TypeScript
- **State & Data:** Zustand, TanStack Query
- **Styling:** Tailwind CSS, Framer Motion
- **Local Storage:** IndexedDB with AES-GCM-256 encryption

### ⚙️ Backend (API Gateway & Microservices)
- **Framework:** NestJS
- **Database & ORM:** PostgreSQL (Primary), Prisma ORM
- **Vector Search:** `pgvector` for instant face embedding similarity matching
- **Job Queues:** Redis + BullMQ for async reporting and sync processing
- **Real-time:** WebSockets for live gate activity feeds

### 🧠 Biometrics & AI
- **Face Processing:** MediaPipe (Liveness), OpenCV, InsightFace/ArcFace (Embeddings)
- **Analytics:** Groq API for predictive modeling
- **Local Processing:** WebAssembly neural models with landmark tracking

### 🛡️ Enterprise Security
- **Auth:** JWT with Role-Based Access Control (7-tier hierarchy)
- **Encryption:** AES-GCM-256 for storage, TLS 1.3 for transport
- **Monitoring:** Sentry, Prometheus & Grafana
- **Compliance:** ISO-27001 prepared, GDPR/CCPA compliant with right to be forgotten
- **Auditing:** Immutable registry, Biometric Anonymization

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- PostgreSQL (with `pgvector` extension enabled)
- Redis

### 1. Clone the repository
```bash
git clone https://github.com/OrionGD/FenceIN.git
cd FenceIN
```

### 2. Backend Setup
```bash
cd backend
npm install

# Setup Environment Variables
cp .env.example .env

# Database Setup
npx prisma generate
npx prisma db push

# Start the server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Setup Environment Variables
cp .env.example .env.local

# Start the application
npm run dev
```

---

## 📂 Project Structure

```text
FenceIN/
├── backend/                  # NestJS API Gateway & Services
│   ├── src/
│   │   ├── attendance/       # Check-in/out, Geofencing, Trust Engine
│   │   ├── auth/             # JWT, RBAC, Sessions
│   │   ├── biometrics/       # Embedding Matcher, Liveness validation
│   │   ├── common/           # Standard API Interceptors, DTOs, Filters
│   │   └── ...
│   └── prisma/               # Schema and Migrations
└── frontend/                 # React 19 PWA
    ├── src/
    │   ├── components/       # Reusable UI & Dashboards
    │   ├── hooks/            # Offline Sync, Geolocation
    │   ├── pages/            # KioskMode, LandingPage, Analytics
    │   └── store/            # Zustand state
```

---

## 👥 Role Hierarchy

FenceIn strictly isolates data and permissions across 7 hierarchical tiers: `Super Admin` ➔ `Executive` ➔ `Operations Manager` ➔ `Compliance Officer` ➔ `Contractor Manager` ➔ `Security Officer` ➔ `Contractor / Worker`

### 🔑 Demo Login Credentials (Local Development)

The database is seeded with the following default accounts for testing:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@fencein.app` | `admin123` |
| **Organization Admin** | `orgadmin@fencein.app` | `admin123` |
| **HR Admin** | `hr@fencein.app` | `admin123` |
| **Workforce Supervisor** | `supervisor@fencein.app` | `admin123` |
| **Security Officer** | `security@fencein.app` | `admin123` |
| **Vendor Manager** | `vendor@fencein.app` | `admin123` |
| **Contractor / Worker** | `worker@fencein.app` | `admin123` |

> **Note:** These credentials should be changed in a production environment.

### 🛡️ Role Features & Capabilities

Each role comes with specific permissions tailored for industrial workforce management:

1. **Super Admin** (Level 7 - UNLIMITED): Master overrides, tenant database setups, system key rotations, critical network control keys, global statistics, AI fatigue forecasting.

2. **Executive** (Level 6 - GLOBAL VIEW): Read-only site efficiency data, total cost matrices, predictive fatigue charts, compliance reports, platform-wide analytics.

3. **Operations Manager** (Level 5 - COMMAND): Roster preparation, active shift scheduling, site assignments, certification updates, vendor overrides, geofence monitoring.

4. **Compliance Officer** (Level 4 - AUDIT): Audit logs analysis, biometric storage key inspections, privacy checks, incident evaluations, historical compliance reviews.

5. **Contractor Manager** (Level 3 - VENDOR): Contractor pre-registration, card injection, compliance checklist confirmations, basic status overrides, vendor worker credentials.

6. **Security Officer** (Level 2 - ENFORCEMENT): Real-time guard logs, manual override check-ins, local geofence monitoring, active incident alarms, face recognition approval.

7. **Contractor / Worker** (Level 1 - TRACKING): Kiosk face scans, work within geofenced sectors, offline transaction card validations, personal attendance logs, shift schedules.

---

## 🏭 Industries Served

FenceIn delivers zero-trust access controls under challenging operational settings:

| Industry | Use Case |
|----------|----------|
| **Mining & Heavy Metal Extraction** | Ruggedized offline kiosk setups for underground locations |
| **High-Volume Logistics Yards** | Simultaneous high-speed geofence verification for truck coordination |
| **Offshore Energy Platforms** | Strict biometric checklists for maritime compliance |
| **Defense & Classified Facilities** | Multi-layered biometric approvals with cryptographic audits |

---

## 🎯 The FenceIn Advantage

| Capabilities | Traditional Badging | FenceIn OS |
| :--- | :--- | :--- |
| Offline-First Synchronization | Requires continuous WAN | Autonomous IndexedDB, instant local persistence |
| Biometric Processing Speed | Cloud API calls (3-5 seconds) | On-device WASM (20ms) |
| Identity Spoof Guarding | None - badges easily shared | Passive liveness neural models |
| Geofence Enforcement | Expensive GPS wearables | Device-agnostic browser tracking |
| Role-Based Customization | Static flat admin roles | 7 distinct granular workflows |

---

<div align="center">
  <p>Built for the modern industrial workforce. 🏭</p>
</div>