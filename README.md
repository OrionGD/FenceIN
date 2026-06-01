<div align="center">
  <img src="image.png" alt="FenceIn Platform" width="250">
  <h1>🛡️ FenceIn Enterprise OS</h1>
  <p><b>Unified Command & Control Architecture for Industrial Workforce Intelligence</b></p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
</div>

FenceIn is an enterprise-grade **Unified Command & Control Architecture** designed for heavy industries, log-yards, classification hubs, and construction sites to securely orchestrate permanent employees and temporary contract workforces. By integrating **multimodal biometrics (facial recognition + fingerprint verification), active geofencing, dual-database data partitioning, and real-time WebSocket syncing**, FenceIn eliminates badging fraud, automates shift enforcement, and yields deep operational intelligence.

---

## 🚀 Platform Overview

FenceIn acts as a high-security operational command hub. The core architecture segregates high-throughput transaction processing from logging overhead, employing robust local biometrics running ONNX neural models directly on client/edge hardware without third-party cloud dependencies.

---

## ✨ Core Highlights & Architecture

### 1. Dual-Database Hybrid Storage
To keep relational identity pipelines performing under high loads, the platform partitions data:
*   **PostgreSQL Relational Core**: Houses high-integrity transactional schemas (Users, Tenants, Worker-Sites, Shifts, Kiosks) and is optimized with `pgvector` index tables for 512-dimensional facial cosine matching.
*   **MongoDB Analytics Logs Engine**: Asynchronously logs raw telemetry streams, biometric inference history cards, Sentry/health metrics, and daily analytical snapshots, keeping PostgreSQL lean.

### 2. Multimodal Local Biometrics Engine
*   **Face Recognition**: Features local UltraFace ONNX sessions for robust cropping, and ArcFace ONNX sessions yielding deterministic **512-dimensional vector embeddings**. Includes variance traps (`variance < 1e-4`) to block static/mock bypass hacks.
*   **Fingerprint Verification**: Extracts keypoint minutiae via ORB keypoint mapping on the Python microservice. Encrypts templates deterministically via **AES-256-CBC** using keys derived from process `JWT_SECRET` through `crypto.scryptSync`. This allows safe exact-match duplicate checks while isolating fingerprint assets per tenant.

### 3. Active Geofencing & Trust Engine
*   Enforces perimeter checks by computing real-time coordinate distances against assigned `Site` radius bounds in meters using the Haversine formula. Geofence bounds breaches trigger automatic `HIGH` severity incidents.
*   Check-in trust scores are computed dynamically using a weighted composite formula:
    $$\text{finalTrustScore} = (F_{\text{conf}} \times 0.4) + (L_{\text{score}} \times 0.3) + (G_{\text{conf}} \times 0.2) + (D_{\text{trust}} \times 0.1)$$
    If the liveness score falls below `0.5`, the scan is rejected and logged as a `CRITICAL` spoof attempt.

### 4. SaaS Tenant Provisioning Pipeline
*   Organizations submit details via onboarding request forms (`OrganizationRequest`).
*   Platform administrators review and provision workspaces through atomic Prisma database transactions.
*   Provisioning automatically builds a `Tenant` context (slug, unique org code like `OG001`), creates a sequential `SUPER_ADMIN` profile (e.g. `SA001`), and forces first-login password updates (`mustChangePassword: true`) and biometric enrollments (`biometricPending: true`).

---

## 🔐 9-Tier Command & Control RBAC Matrix

FenceIn isolates data and privileges across 9 granular hierarchical tiers:

| Tier | Role String | Level Scope | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **9** | `PLATFORM_HEAD` | PLATFORM CONTROL | System-wide aggregates, signup requests review, tenant provisioning transactions, multi-tenant incident monitoring. |
| **8** | `PLATFORM_ADMIN` | PLATFORM COMPLIANCE | Reviewing pending signup requests and auditing global security event logs. |
| **7** | `SUPER_ADMIN` | TENANT COMMAND | Single tenant command dashboard, profile setups, manager allocations, CSV exports. |
| **6** | `ORG_ADMIN` | ORG CONFIG | Managing organization profiles, site GPS geofences mapping, vendor registrations. |
| **5** | `HR_ADMIN` | HR COMPLIANCE | Worker credentials validation, govt IDs tracking, generating timesheet billing matrices. |
| **4** | `SUPERVISOR` | SITE COMMAND | Creating shift schedules, roster allocations, manual override check-ins, active geofence alerts. |
| **3** | `SECURITY_OFFICER` | GATE CONTROL | Biometric gate kiosk monitors, face liveness reviews, active spoof alarm handling. |
| **2** | `VENDOR_MANAGER` | VENDOR SCOPE | Pre-registering sub-contractors and mapping workers under approved vendor contracts. |
| **1** | `WORKER` | TRACKING | Scanning geofenced kiosks, tracking schedules, viewing IndexedDB sync logs cards. |

---

## 🔑 Seeded Demo Credentials (Local Development)

The local databases are seeded with pre-configured accounts mapped to various roles for seamless testing:

### Platform-Level Accounts (Global Scope)
| Seeded User ID | Email address | Password | Initial Role |
| :--- | :--- | :--- | :--- |
| `PLT001` | `godfrey.cs23@krct.ac.in` | `FenceIN@PLTHead` | **Platform Head** (`PLATFORM_HEAD`) |
| `PLT002` | `grishnarayanan.cs23@krct.ac.in` | `FenceIN@PLTHead` | **Platform Head** (`PLATFORM_HEAD`) |
| `PLT003` | `girijesh.cs23@krct.ac.in` | `FenceIN@PLTHead` | **Platform Head** (`PLATFORM_HEAD`) |

### Tenant-Level Accounts (Seeded Tenant: `SHIELD`)
| Seeded User ID | Email address | Password | Initial Role |
| :--- | :--- | :--- | :--- |
| `SA001` | `superadmin@fencein.app` | `admin123` | **Super Admin** (`SUPER_ADMIN`) |
| `OA001` | `orgadmin@fencein.app` | `admin123` | **Organization Admin** (`ORG_ADMIN`) |
| `HR001` | `hr@fencein.app` | `admin123` | **HR Admin** (`HR_ADMIN`) |
| `SV001` | `supervisor@fencein.app` | `admin123` | **Workforce Supervisor** (`SUPERVISOR`) |
| `SO001` | `security@fencein.app` | `admin123` | **Security Officer** (`SECURITY_OFFICER`) |
| `VM001` | `vendor@fencein.app` | `admin123` | **Vendor Manager** (`VENDOR_MANAGER`) |
| `WRK001` | `worker@fencein.app` | `admin123` | **Contractor / Worker** (`WORKER`) |

> ⚠️ **Production Security Notice:** Pre-configured passwords must be rotated immediately in public/production staging installations.

---

## 🏗️ Technical Stack

### PWA Frontend Client
*   **Core framework**: React 19 + Vite + TypeScript
*   **State manager**: Zustand, TanStack Query
*   **UX styling**: Vanilla CSS + Tailwind CSS, Framer Motion animations
*   **Local persistence**: IndexedDB + Service Workers background sync

### Backend REST API Gateway
*   **Gateway**: NestJS
*   **SQL DB**: PostgreSQL (using Prisma ORM and `pgvector`)
*   **NoSQL DB**: MongoDB (using native drivers for async analytical offloads)
*   **Realtime**: WebSockets (`socket.io` Gateway feeds)

### Biometrics Processing Service
*   **Processor Engine**: Python 3 + FastAPI microservice
*   **Computer Vision**: OpenCV + ONNX Runtime (UltraFace RFB-320 + ArcFace models)
*   **Minutiae mapping**: ORB keypoint extraction

---

## 🚀 Getting Started

### 1. Clone & Pre-requisites
*   Node.js (v20+)
*   Docker or local setups for PostgreSQL and MongoDB
*   Python 3.10+
```bash
git clone https://github.com/OrionGD/FenceIN.git
cd FenceIN
```

### 2. Backend Gateway Setup
```bash
cd backend
npm install
cp .env.example .env
# Migrate schema models
npx prisma generate
npx prisma db push
# Seeding platform accounts triggers automatically during 'npm run dev' initialization
npm run dev
```

### 3. Biometrics Python Service Setup
```bash
cd biometrics_service
python -m venv venv
venv\Scripts\activate     # Windows powershell
pip install -r requirements.txt
python download_models.py
uvicorn app:app --port 8000
```

### 4. Frontend Web App Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 📂 Project Structure

```text
FenceIN/
├── backend/                  # NestJS API Gateway
│   ├── src/
│   │   ├── platform/         # Platform dashboard & Provisioning transactions
│   │   ├── auth/             # Tenant checks & Auth session logic
│   │   ├── biometrics/       # AES template encrypter & Similarity checks
│   │   ├── attendance/       # Geofence boundary calculations & Trust score compiler
│   │   └── mongo/            # Secondary MongoDB analytical logging
│   └── prisma/               # PostgreSQL schema configurations
├── biometrics_service/       # Python CV Engine (FastAPI, OpenCV, ONNX models)
└── frontend/                 # React 19 PWA Client
    ├── src/
    │   ├── modules/          # Lazy-loaded, code-split sub-routes per role
    │   ├── store/            # Auth, sync, and dashboard Zustand stores
    │   └── components/       # Premium UI dashboard shells
```

---

<div align="center">
  <p>Built for zero-trust industrial access control. 🏭🛡️</p>
</div>