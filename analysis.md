# FenceIn — Comprehensive System Analysis & Audit Report

## 1. Executive Summary
FenceIn is an enterprise-grade biometric workforce intelligence, physical access control, and contractor management platform designed for industrial, corporate, and high-security temporary workforce environments. The application solves critical challenges in large-scale workforce administration, including attendance fraud, unauthorized access, and complex contractor tracking. It acts as an operational intelligence system integrating facial recognition, fingerprint verification, active geofencing, role-based workflows, offline readiness, and real-time synchronization.

---

## 2. System Architecture

The architecture relies on a highly scalable, decoupled full-stack foundation with edge-processing capabilities:

*   **Frontend (React 19 + Vite + TypeScript PWA)**: A Progressive Web App optimized for offline-first operations. State is managed via Zustand and TanStack Query. Styling uses Vanilla CSS combined with Tailwind CSS and Framer Motion for a premium, highly responsive glassmorphism UX. Routes are lazy-loaded and code-split per administrative role to minimize initial bundle size.
*   **Backend (NestJS + TypeScript API Gateway)**: An enterprise-grade gateway orchestrating specialized modules (Auth, Platform management, Biometrics, Attendance, Vendors, Workers, AI Analytics).
*   **Dual-Database Hybrid Storage Architecture**:
    *   **PostgreSQL (Primary Relational Store)**: Managed via Prisma ORM, it houses relational identity, tenant profiles, worker-site bindings, shifts, kiosk configurations, and geofences. Enabled with the `pgvector` extension to execute high-performance 512-dimensional vector similarity matches.
    *   **MongoDB (Secondary NoSQL Analytics Store)**: Offloads unstructured logging and high-frequency analytical events to keep PostgreSQL lean. All audit trails (`audit_logs`), biometric inference telemetry (`inferences`), server telemetry metrics (`telemetry`), and daily performance aggregates (`snapshots`) are written asynchronously via `MongoService`.
*   **Biometrics Service (Python + FastAPI)**: A high-performance computer vision microservice loaded with ONNX Runtime neural engine models. It runs local, hardware-accelerated face detection (UltraFace) and embedding extraction (ArcFace), as well as ORB fingerprint keypoint matching.
*   **AI Integration (Groq API)**: Embeds LLM intelligence for workforce trend analysis, predictive absentee alerts, and smart natural language administrative queries.
*   **Realtime & Offline Stack**: WebSockets (`socket.io`) push active gate feeds and incidents, while IndexedDB queues encrypted local attendance entries during network outages.

---

## 3. Workflow System Analysis

### 3.1 9-Tier Authentication & RBAC Matrix
The system isolates data and operations through a granular 9-tier role-based access control (RBAC) matrix. Token claims, API routes, and frontend views are enforced by NestJS Guards (`JwtAuthGuard`, `TenantGuard`, `RolesGuard`) and React Route protectors:

1.  **`PLATFORM_HEAD`** (Tier 9 - PLATFORM SCOPE): Platform-wide command. Bypasses tenant isolation guards. Possesses exclusive access to platform-wide dashboard analytics, signup request audits, and new tenant provisioning.
2.  **`PLATFORM_ADMIN`** (Tier 8 - PLATFORM CONTROL): Assisting administrator role with review privileges for organization signup requests and global configuration audits.
3.  **`SUPER_ADMIN`** (Tier 7 - TENANT COMMAND): Complete administrative authority within their single tenant context. Oversees tenant-wide operations, security profiles, and analytics.
4.  **`ORG_ADMIN`** (Tier 6 - ORG CONTROL): Manages organizational setups, defines virtual geofence coordinates, registers vendor contracts, and manages the worker directory.
5.  **`HR_ADMIN`** (Tier 5 - COMPLIANCE): Manages HR compliance (blood group, government ID validation, skill classifications) and exports detailed shift/payroll sheets.
6.  **`SUPERVISOR`** (Tier 4 - SITE CONTROL): Organizes site shift rosters, approves manual check-in overrides, and monitors active geofence breach alarms.
7.  **`SECURITY_OFFICER`** (Tier 3 - ENFORCEMENT): Controls physical biometric gate kiosks, monitors real-time face scans and liveness logs, and handles active incidents.
8.  **`VENDOR_MANAGER`** (Tier 2 - VENDOR SCOPE): Onboards temporary contract workers and registers vendor credentials under approved active jobs.
9.  **`WORKER`** (Tier 1 - TRACKING): Logs check-ins and check-outs via geofenced kiosk terminals and views active shift schedules and local sync cards.

### 3.2 Onboarding & Multi-Tenant Provisioning Workflow
1.  **Access Request**: Organizations submit signups via `/platform/submit-request`, registering expected user count, branch counts, and deployment preferences.
2.  **Review**: A `PLATFORM_HEAD` reviews requests and issues status updates (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`).
3.  **Atomic Transaction**: Upon approval, the tenant is provisioned via an atomic transaction:
    *   Generates a new `Tenant` record with a unique sequential code (e.g., `OG001`) and slug.
    *   Creates the tenant's first **`SUPER_ADMIN`** user with a custom ID (e.g., `SA001`) and temporary password (`FenceIN@TempPass123`).
    *   Flags the super admin with `mustChangePassword: true` and `biometricPending: true` to mandate profile updates on initial login.

### 3.3 Multimodal Biometric Verification Pipeline
The biometric pipeline is fully local and optimized for high precision and zero-mock security:

```text id="biometric_pipeline"
       [FACE BIOMETRIC PIPELINE]                    [FINGERPRINT BIOMETRIC PIPELINE]
            Camera Capture                                   Scanner Capture
                  ↓                                                 ↓
         UltraFace Detection                             ORB Keypoint Extraction
                  ↓                                                 ↓
    ArcFace 512D Embedding Generation              Template Encrypted (AES-256-CBC)
                  ↓                                                 ↓
      pgvector Similarity Search                      Isolated Database Comparison
         (Cosine Distance <=> )                                     ↓
                  ↓                                     Threshold match (>=20)
       Match Found (Thresh: 0.55)
```

#### Facial Biometrics
*   **Detection**: UltraFace (`version-RFB-320.onnx`) detects and crops faces with high robustness. Non-Maximum Suppression (NMS) filters overlapping bounding boxes.
*   **Embeddings**: ArcFace (`arcface.onnx`) extracts deep L2-normalized **512-dimensional vector embeddings**.
*   **Mock Prevention**: Embeddings must pass quality checks (`variance < 1e-4`) to reject static mock/bypass arrays.
*   **Vector Match**: Cosine similarity is checked in PostgreSQL using `pgvector` distance: `1 - ("faceEmbedding"::vector <=> $1::vector)`. The match threshold is **0.55**, and the duplicate prevention limit is **0.82**.

#### Fingerprint Biometrics
*   **Extraction**: Captures are routed to the Python microservice to map ORB keypoint descriptors.
*   **Storage**: Templates are encrypted using **AES-256-CBC** (deterministic cipher derived via `crypto.scryptSync` from `JWT_SECRET`) to ensure secure, isolated duplicate verification within the tenant database.
*   **Verification**: Templates match against the database using ORB template comparison, requiring a threshold of 20 good keypoint matches.

### 3.4 Active Geofencing & Attendance Confidence Engine
*   **Geofencing**: When checking in, the worker's coordinate coordinates are compared against their assigned `Site` center and radius (in meters) via the Haversine formula. Exceeding the radius triggers a `GEOFENCE_VIOLATION` incident of `HIGH` severity and blocks the check-in.
*   **Composite Trust**: The system calculates a weighted trust score for every check-in:
    $$\text{finalTrustScore} = (F_{\text{conf}} \times 0.4) + (L_{\text{score}} \times 0.3) + (G_{\text{conf}} \times 0.2) + (D_{\text{trust}} \times 0.1)$$
    Where $F_{\text{conf}}$ is face confidence, $L_{\text{score}}$ is liveness score, $G_{\text{conf}}$ is geofence status confidence, and $D_{\text{trust}}$ is device trust.
*   **Anti-Spoofing**: If the liveness score falls below `0.5`, check-in is rejected, and a `SPOOF_ATTEMPT` incident is logged with `CRITICAL` severity.

---

## 4. File Structure & Module Audit

### 4.1 Backend Repository (`/backend`)
*   `/src/platform/`: Exposes platform endpoints to Platform Heads to review requests and provision SaaS tenants (`platform.controller.ts`).
*   `/src/biometrics/`: Manages AES encryption, variance checks, and calls to the Python CV microservice (`biometrics.service.ts`).
*   `/src/attendance/`: Implements the geofence checker, shift time-window validation, and composite trust calculator.
*   `/src/mongo/`: Asynchronously logs telemetry, inferences, snapshots, and audit records.
*   `/src/events/`: Implements the `EventsGateway` (`socket.io`) for pushing realtime incident and gate logs.

### 4.2 Frontend Repository (`/frontend`)
*   `/src/modules/core/`: Implements core navigation layouts (`DashboardLayout.tsx`) and the universal dashboard landing (`RoleBasedDashboard.tsx`).
*   `/src/modules/security-officer/pages/KioskControlPage.tsx`: Fullscreen kiosk mode for local face and fingerprint scans.
*   `/src/components/navigation/HolographicPortal.tsx`: Dynamic role-aware navigation bar rendering based on active JWT claims.

---

## 5. Database Schema Audit (`schema.prisma`)

The Prisma schema is optimized for multi-tenant isolation and vector indexing:

*   **`User` Model**:
    *   `roleLevel`: Stores the hierarchical numeric role level.
    *   `faceEmbedding`: Stored securely as an `Unsupported("vector(512)")` vector column.
    *   `fingerprintTemplate`: Stores the AES-256-CBC encrypted fingerprint keypoint template.
    *   `biometricPending` / `biometricEnrolled`: Tracks onboarding completion.
    *   `reportsTo`: Subordinate self-relation (`reportsTo` linked to `user_id`).
*   **`Tenant` Model**: Represents isolated company contexts (`name`, `slug`, `organizationCode` (format `OG001`), `plan`).
*   **`OrganizationRequest` Model**: Manages onboarding signups and review logs.
*   **`Kiosk` Model**: Fully implemented. Tracks kiosks (`name`, `siteId`, `cameraLocation`, `isActive`, `deviceId`).
*   **`Shift` Model**: Fully implemented. Tracks shift bounds (`startTime`, `endTime`, `gracePeriodMin`, `isOvernight`).
*   **`Incident` Model**: Fully implemented. Stores logs (`type` (e.g. `SPOOF_ATTEMPT`), `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `description`).
*   **`UserBiometrics` & `BiometricAuditLog` Models**: Keeps track of enrollment metadata.

---

## 6. System Audit Conclusion

**Architecture Rating: Exceptional**
FenceIn's split architecture successfully resolves the latency and security trade-offs of physical deployments:
*   **pgvector** allows fast, relational, transaction-safe face similarity searches within PostgreSQL without needing an external vector database.
*   **AES encrypted templates** enable exact-match duplicate checks for fingerprints without exposing sensitive keypoints.
*   **MongoDB offloading** guarantees that transaction processing databases are not slowed down by high-frequency logging of raw telemetry and liveness scores.

---

## 7. Enterprise Evolution Roadmap

### 7.1 Implemented & Fully Operational Elements
The following features are **100% built and operational** in the system:
*   **Platform commands & requests**: Complete review and provisioning transactions.
*   **Multimodal biometrics**: Integrated face and fingerprint ONNX engines.
*   **Device registers**: Full `Kiosk` registrations and status checkings.
*   **Shift schedules**: Time-window grace periods and overnight shifts.
*   **Incident systems**: Automatic classification and alerts for spoof attempts and geofence violations.
*   **Audit logs**: Dual-database offloading to MongoDB.

### 7.2 Future Scalability Roadmap
The next iteration of developmental focus will target the following priorities:
1.  **Polygon Geofencing**: Support multi-point coordinate areas on leaf maps for specialized zones.
2.  **Queue Processing**: Integrate BullMQ + Redis for background job caching, async exports, and heavy image normalization.
3.  **High-Availability Disaster Recovery**: Multi-region database backups and local client sync reconciliation recovery tests.
4.  **Advanced Server Monitoring Stack**: Integrate Sentry and Prometheus/Grafana alerts for API gateway latency spikes.
