# FenceIN Architecture Enforcement: Zero-Mock Telemetry Policy

## Overview

This document defines the **strict, non-negotiable rules** governing how data flows through the FenceIN platform. These rules are enforced at CI time via `scripts/ci-static-check.js` and must be respected by every engineer contributing to this codebase.

---

## Rule 1: No Frontend Mock / Fallback / Simulated Data

### The Absolute Rule

> **No frontend component may render fallback mock arrays, static defaults, or simulated telemetry when backend responses are empty, null, failed, or unavailable.**

### Allowed States When Data Is Unavailable

| Scenario | Required UI |
|---|---|
| Request in flight | `isLoading` spinner / shimmer pulse |
| Empty database (no records yet) | Empty state card with onboarding guidance |
| Network / API error | Retry card with the actual error message |
| HTTP 401 / 403 | Permission Denied state with role-context guidance |

### Explicitly Banned

- ❌ `Math.random()` for any metric, score, telemetry value, or biometric result
- ❌ `faker.*` or any data generator library in production code
- ❌ Hardcoded fallback numbers: `122`, `99.8%`, `84 Workers`, etc.
- ❌ `setInterval` loops that mutate simulated CPU, RAM, heart rate, or latency state
- ❌ Static inline chart datasets (e.g. `[{ label: 'MON', value: 890 }]`)
- ❌ Static `mockData`, `dummyData`, `fakeData` variable declarations
- ❌ Simulated websocket event emitters or fake SSE producers
- ❌ Silent fallback: `data || staticArray` patterns that hide backend failures

---

## Rule 2: Identity Must Derive from JWT → Backend → Database

### The Chain

```
Browser Login Form
  ↓ credentials / biometric frame
Python FastAPI Biometrics Service (localhost:8000)
  ↓ verified identity + pre-auth JWT
NestJS Gateway (localhost:3456)
  ↓ full-auth JWT with role + userId
Frontend Zustand store (token only)
  ↓ every API call includes Bearer token
Backend enforces RBAC via JwtAuthGuard + RolesGuard
```

### Banned Auth Patterns

- ❌ `isAuthenticated = true` hardcoded locally
- ❌ Role stored in `localStorage` and trusted without backend validation
- ❌ Any `useEffect` that sets user identity from a local object literal
- ❌ Bypassing biometric check for convenience during development

---

## Rule 3: Every Dashboard Metric Must Declare Its Lineage

Each KPI card, chart, or gauge **must** have the following metadata available (as a tooltip or comment):

| Field | Example |
|---|---|
| Authoritative Source | `PostgreSQL → prisma.user.count()` |
| Backend Owner | `AnalyticsService.getDashboard()` |
| Refresh Interval | `15 seconds` |
| Cache TTL | `No cache — direct DB query` |
| Security Scope | `SUPER_ADMIN, ORG_ADMIN, HR_ADMIN` |

---

## Rule 4: Live Synchronization Is Mandatory for Operational Dashboards

Static snapshot rendering is not sufficient. All operational dashboards must implement **at least one** of:

- ✅ **WebSocket** (`socket.io-client` → `attendance_update` events from NestJS EventsGateway)
- ✅ **Interval Revalidation** (minimum: every 15 seconds via `setInterval(fetchDashboard, 15000)`)
- ✅ **SSE** (Server-Sent Events from a NestJS streaming endpoint)

---

## Rule 5: AI Assistant Strict Boundaries

The Groq LLM integration (`/api/v1/ai/query`) must NEVER:

- ❌ Impersonate a real employee, manager, or executive
- ❌ Fabricate executive approvals, sign-offs, or operational decisions
- ❌ Generate fake telemetry readings or invent incident reports
- ❌ Roleplay as a human supervisor or security officer

The system prompt enforces these constraints. Any change to `ai.service.ts` system prompt must be reviewed.

---

## Rule 6: Backend DTO Requirements

All API responses consumed by the frontend must:

1. **Have a strict TypeScript DTO** (class-validator decorated) on the backend
2. **Return `null` or `[]`** for empty states — never omit fields
3. **Surface structured errors** with `{ message, statusCode }` shape so the frontend can display real error messages
4. **Never return hardcoded example data** from any controller

---

## CI Enforcement

Run before every merge:

```bash
npm run ci-check
```

The script scans `frontend/src` and `backend/src` for all banned patterns and exits non-zero if any are found.

**This check must pass. There are no exceptions.**

---

## Backend Endpoints Reference

| Data | Endpoint | Owner |
|---|---|---|
| Live dashboard metrics | `GET /api/v1/analytics/dashboard` | `AnalyticsService` |
| Daily snapshots | `GET /api/v1/analytics/snapshots` | `AnalyticsService` |
| Audit logs | `GET /api/v1/analytics/audit-logs` | `AnalyticsService` |
| Inference logs | `GET /api/v1/analytics/inferences` | `AnalyticsService` |
| AI query | `POST /api/v1/ai/query` | `AiService` |
| Workers | `GET /api/v1/workers` | `WorkersService` |
| Sites | `GET /api/v1/sites` | `SitesService` |
| Vendors | `GET /api/v1/vendors` | `VendorsService` |
| Biometric enroll | `POST /api/v1/biometrics/enroll` | `BiometricsService` |
| Biometric face login | `POST /api/v1/biometrics/face-login` | `BiometricsService` |
| Liveness check | `POST /api/v1/liveness-check` | Python FastAPI |
| PPE check | `POST /api/v1/ppe-check` | Python FastAPI |
| WebSocket | `ws://localhost:3456` | `EventsGateway` |
