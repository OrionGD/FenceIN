# FenceIn — Comprehensive System Analysis & Audit Report

## 1. Executive Summary
FenceIn is an AI-powered biometric workforce intelligence and contractor management platform designed for industrial, enterprise, and temporary workforce environments. The application solves critical challenges in large-scale workforce administration, including attendance fraud, unauthorized access, and complex contractor tracking. It acts as an operational intelligence system integrating facial recognition, geofencing, role-based workflows, offline readiness, and real-time synchronization.

## 2. System Architecture

The architecture relies on a modern, robust full-stack foundation:

*   **Frontend (React 19 + Vite + TypeScript):** A Progressive Web App (PWA) built for high performance and offline capabilities. State is managed via Zustand and TanStack Query. Styling is handled with Tailwind CSS and Framer Motion for a fluid, professional UX.
*   **Backend (NestJS + TypeScript):** A modular, enterprise-grade API Gateway managing isolated services (Auth, Attendance, Biometrics, Vendors, Workers, AI Analytics).
*   **Database (PostgreSQL + Prisma ORM + pgvector):** Primary relational data store extended with `pgvector` for processing high-dimensional facial embeddings securely. MongoDB serves as a secondary database, alongside Cloudinary for blob storage.
*   **AI Integration (Groq API):** Embeds LLM intelligence for workforce trend analysis, absentee prediction, and smart administrative queries.
*   **Realtime & Offline Stack:** WebSockets for live monitoring feeds and IndexedDB + Service Workers for offline-first resilience.

## 3. Workflow System Analysis

### 3.1 Authentication & RBAC Flow
A robust JWT-based Auth system mapped against a granular Role Hierarchy:
`Super Admin -> Org Admin -> HR Admin -> Supervisor -> Security Officer -> Vendor Manager -> Worker`
Each action and API route is protected by Guards, ensuring strict operational boundaries between vendor management, HR operations, and worker interactions.

### 3.2 Workforce & Contractor Lifecycle
The platform divides workforce into permanent employees and temporary/vendor-supplied workers. Vendor Managers can onboard contract workers, subject to Supervisor approvals. The lifecycle includes shift allocation, department assignment, and continuous contract tracking.

### 3.3 Biometric Attendance Pipeline
The core attendance loop is automated and AI-validated:
1.  **Capture & Quality Check:** Camera capture validated by MediaPipe and OpenCV (blur, brightness, spoofing).
2.  **Embedding:** InsightFace/ArcFace generates a 128-dimensional embedding.
3.  **Vector Match:** `pgvector` executes a similarity search against the database.
4.  **Geofencing Check:** Validation of latitude/longitude against assigned `Site` radius (meters).
5.  **Decision:** System logs attendance, marks as "VALID", "VIOLATION", or "NO_GPS".

### 3.4 Offline-First Infrastructure
Designed for harsh industrial environments, the PWA relies on IndexedDB to queue encrypted attendance records when the internet drops. A Service Worker background sync reconciles local queues with the server once connectivity is restored, ensuring zero data loss.

## 4. File Structure & Module Audit

### 4.1 Frontend Repository (`/frontend`)
The presentation layer is cleanly separated into specialized directories:
*   `/src/pages/`: 
    *   `LandingPage.tsx`: Primary entry point.
    *   `KioskMode.tsx`: Fullscreen, touch-friendly interface for facial attendance capture at physical gates.
    *   `WorkersView.tsx`, `VendorsView.tsx`, `SitesView.tsx`: CRUD and management dashboards for entities.
    *   `AttendanceView.tsx`: Monitoring and logging dashboard.
    *   `AiAnalyticsView.tsx`: Smart insights interface.
*   `/src/components/`: Reusable UI elements (`Sidebar.tsx`, `Modal.tsx`, `ProtectedRoute.tsx`).
*   `/src/store/`: Zustand state management.
*   `/src/hooks/`: Custom React hooks for API and data lifecycle.

### 4.2 Backend Repository (`/backend`)
A modular NestJS architecture ensuring separation of concerns:
*   `/src/auth/`: JWT issuance and RBAC enforcement.
*   `/src/biometrics/`: Handles embedding generation and spoof detection.
*   `/src/attendance/`: Core logic for shift validation, check-in/out, and geofence tracking (`attendance.controller.ts`, `attendance.service.ts`).
*   `/src/vendors/` & `/src/workers/`: Entity management and hierarchy enforcement.
*   `/src/sites/`: Geofence management.
*   `/src/ai/`: Groq API wrappers for data summarization.
*   `/src/events/`: WebSocket gateways for realtime streaming.

## 5. Database Schema Audit (`schema.prisma`)

The Prisma schema is tightly coupled to the system workflows:

*   **`User` Model:** Stores authentication data, `Role` enum, and securely holds `faceEmbedding` as an `Unsupported("vector(128)")` field via `pgvector`.
*   **`Vendor` Model:** Links to a `User` (Manager) and holds company contact details.
*   **`Site` Model:** Central to geofencing; contains `latitude`, `longitude`, and `radius`.
*   **`WorkerSite` Model:** A junction table securely associating workers to approved physical sites.
*   **`Attendance` Model:** Comprehensive event log containing `checkIn`/`checkOut` times, `confidence` score from facial matching, and granular geolocation telemetry (`latitude`, `longitude`, `distance`, `withinFence`, `geofenceStatus`).

## 6. System Audit Conclusion

**Architecture Rating: Exceptional.**
The system bridges software efficiency with physical security requirements perfectly. The choice of `pgvector` directly inside PostgreSQL eliminates the need for an external vector database, keeping operations atomic and reducing latency. The integration of offline IndexedDB caching guarantees resilience in poor network zones, which is a critical requirement for construction and warehouse environments. 

**Next Steps & Recommendations:**
1.  **Security Hardening:** Ensure AES encryption is actively wrapping local IndexedDB queues as per Phase 11 of the development roadmap.
2.  **Testing Coverage:** Expand `/backend/src/attendance/attendance.service.spec.ts` unit tests to cover offline reconciliation edge cases.
3.  **Reporting Engine:** Finalize the PDF/Excel enterprise reporting engine (Phase 10) to facilitate payroll integrations.

## 7. Enterprise Evolution Roadmap

To transition FenceIn from a strong foundation to a **deployable industrial platform** (Enterprise Workforce Intelligence & Physical Access Control Platform), the following features represent the critical path forward.

### 7.1 Immediate Step: System Standardization
Before implementing the next set of complex features, establish strict foundational standards:
1.  **API Standards:** Uniform Response, Error, Validation, and Pagination formats.
2.  **DTO Standards:** Consistent validation, serialization, and transformation rules.
3.  **Logging Standards:** Structured, queryable logs.
4.  **Folder Standards:** Strict modular architecture enforcement.
5.  **Coding Standards:** Automated enforcement via ESLint, Prettier, Husky, and commitlint.

### 7.2 The Next 20 Enterprise Requirements
1.  **Liveness Detection (CRITICAL):** Use MediaPipe Face Mesh & OpenCV to detect blinking, slight head movement, eye movement, and facial depth changes to prevent photo/screen spoofing.
2.  **Device Fingerprinting:** Bind attendance to specific allowed devices (Browser fingerprint, Device ID, Kiosk ID).
3.  **Multi-Camera Kiosk Support:** Add `Kiosk` Prisma model (`id`, `name`, `siteId`, `cameraLocation`, `isActive`) for entry/exit gates and restricted zones.
4.  **Shift Intelligence Engine:** Handle grace periods, overnight shifts, rotating/split shifts, holiday/weekend rules, and overtime policies.
5.  **Payroll Engine:** Auto-calculate hours, overtime, late deductions, and contractor billing with exports to SAP, Tally, Excel, and ERPs.
6.  **Incident & Violation System:** Categorize incidents (late arrival, unauthorized zone entry, spoof attempts) by severity (LOW, MEDIUM, HIGH, CRITICAL).
7.  **Audit Trail System:** Track logins, profile edits, attendance overrides, and exports (Who, When, Old/New value, IP, Device).
8.  **Notification Engine:** Alert channels (Email, SMS, WhatsApp, Push) for absentees, overtime, contract expiries, and security.
9.  **Face Embedding Encryption:** Implement AES encryption, signed embeddings, and secure retrieval for `pgvector` data.
10. **Hierarchical Organization System:** Support structures like Organization -> Branch -> Department -> Zone -> Site.
11. **Worker Lifecycle Engine:** Granular states: INVITED, REGISTERED, ACTIVE, SUSPENDED, TERMINATED, BLACKLISTED.
12. **Advanced Geofence System:** Polygon zones, restricted areas, time-based/temporary zones, and role-specific zones.
13. **Attendance Confidence Engine:** Final trust score based on face, geofence, liveness, and device confidence.
14. **Queue Processing System:** Integrate BullMQ + Redis for async sync jobs, reporting, AI queries, and image processing.
15. **Analytics Warehouse:** Separate analytics database for dashboards and AI insights.
16. **Enterprise Monitoring:** Sentry, Prometheus, and Grafana for tracking API/sync failures, latency, and kiosk uptime.
17. **Kiosk Lockdown Mode:** Fullscreen enforcement, escape prevention, admin unlock PIN, and auto logout.
18. **Image Compression Pipeline:** Resize, crop, compress, and normalize images before upload.
19. **Multi-Tenant SaaS Architecture:** Tenant isolation for organizations, billing, and storage.
20. **Disaster Recovery System:** DB backups, sync recovery, conflict resolution, and duplicate prevention.

### 7.3 Priority Implementation Roadmap
1.  **Liveness Detection**
2.  **Shift Engine**
3.  **Device Fingerprinting**
4.  **Audit Logs**
5.  **Incident System**
6.  **Payroll Engine**
7.  **Notification System**
8.  **Queue Processing**
9.  **Monitoring Stack**
10. **SaaS Multi-Tenant Architecture**
