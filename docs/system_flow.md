# FenceIN — Complete System Architecture & Data Flow

This document details the complete end-to-end system topology, component interactions, database schemas, and workflows governing the **FenceIN Enterprise Workforce Security & Biometric Attendance Platform**. It serves as the single source of truth for architectural structure, data lineages, security pipelines, and offline-first orchestration.

---

## 1. System Topology & Architectural Blueprint

The FenceIN ecosystem utilizes a split-service design consisting of a high-performance **FastAPI Biometrics Engine** (running on Port `8000`) for media operations, computer-vision inferences, and raw biometric validation, and a structured **NestJS API Gateway** (running on Port `3456`) for enterprise business logic, tenancy, RBAC authorization, and state storage.

```mermaid
graph TB
    subgraph Frontend Client ["Frontend Web & Kiosk Client (React 19 + TypeScript + Vite)"]
        UI["UI View Components (Tailwind CSS)"]
        ZS["Zustand State Store (JWT, Roles)"]
        TQ["TanStack Query (Data Fetching)"]
        SW["IndexedDB Queue (Offline Sync Hook)"]
        Cam["Webcam & Media Stream Capture"]
    end

    subgraph FastAPI Service ["Biometrics & Auth Engine (Python FastAPI - Port 8000)"]
        FA["FastAPI Controllers"]
        CV["OpenCV & MediaPipe CV Pipeline"]
        LA["Liveness Texture Analysis"]
        FA_AES["AES Biometric Encryption / Decryption"]
        FA_DB["psycopg2 DB Connection Handler"]
    end

    subgraph NestJS Gateway ["API Gateway (NestJS Core - Port 3456)"]
        NC["NestJS Controllers / Router"]
        NG["JwtAuthGuard / RolesGuard (RBAC)"]
        NS["Prisma ORM Client Layer"]
        WE["EventsGateway (WebSocket Engine)"]
        Groq["Groq AI Service (Groq LLM Client)"]
        MongoSvc["MongoService (Structured Audits)"]
    end

    subgraph Data Layer ["Storage & Vector Persistence"]
        Postgres[(PostgreSQL Instance)]
        PgVector["pgvector Extension (512D Embeddings)"]
        MongoDB[(MongoDB Telemetry & Audits)]
    end

    %% Client Interactions
    UI --> ZS
    UI --> TQ
    UI --> SW
    Cam --> FA
    TQ -- "/api/v1/workers, /sites, /analytics" --> NC
    Cam -- "Frame & Webcam Payload" --> FA
    UI -- "WebSocket Connect" --> WE

    %% Internal Services Connection
    NC -- "callPythonBiometrics() proxy /face/verify" --> FA

    %% Python Database & Logging Connections
    FA -- "Direct pgvector 1:N / 1:1 Math" --> Postgres
    FA -- "telemetry & inference logs" --> MongoDB
    FA_DB --> Postgres
    FA_AES --> Postgres

    %% NestJS Database & Logging Connections
    NC --> NG
    NG --> NS
    NS --> Postgres
    Postgres --> PgVector
    MongoSvc --> MongoDB
    Groq --> MongoDB

    %% Styles
    classDef client fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#01579b;
    classDef fastapi fill:#efebe9,stroke:#8d6e63,stroke-width:2px,color:#3e2723;
    classDef nestjs fill:#ffebee,stroke:#ef5350,stroke-width:2px,color:#b71c1c;
    classDef storage fill:#e8f5e9,stroke:#66bb6a,stroke-width:2px,color:#1b5e20;

    class UI,ZS,TQ,SW,Cam client;
    class FA,CV,LA,FA_AES,FA_DB fastapi;
    class NC,NG,NS,WE,Groq,MongoSvc nestjs;
    class Postgres,PgVector,MongoDB storage;
```

---

## 2. Shared Identity & The RBAC Chain of Trust

Authentication flows through a rigorous zero-trust pipeline where identities verified through password hashes or computer-vision biometric scoring produce signed JWT keys containing organizational tenancy constraints. All downstream HTTP requests enforce Role-Based Access Control (RBAC) validations.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Webcam / Input)
    participant Python as Python FastAPI Engine (8000)
    participant Nest as NestJS Gateway (3456)
    participant DB as PostgreSQL Database
    participant Mongo as MongoDB logs

    %% Biometric Login / Match Sequence
    Note over User, DB: 1:N Biometric Identification Sequence
    User->>Python: POST /api/v1/auth/face-login (base64 image, tenantId)
    activate Python
    Python->>Python: base64_to_image() & Crop Face Frame
    Python->>Python: check_liveness_texture() (Passive Liveness)
    alt Liveness Check Failed
        Python->>Mongo: Log AI Inference outcome='liveness_fail'
        Python-->>User: HTTP 401: Spoofing Attempt Blocked
    else Liveness Check Passed
        Python->>Python: generate_face_embedding() -> 512D Vector
        Python->>DB: Query Cosine Similarity: 1 - (faceEmbedding <=> inputVector)
        DB-->>Python: Return Matched User Profile (Confidence >= 0.72)
        alt No Matching Biometrics or Confidence < 0.72
            Python->>Mongo: Log AI Inference outcome='no_match'
            Python-->>User: HTTP 401: Biometric Mismatch
        else Biometric Verified Successfully
            Python->>Python: Generate Shared JWT Access Token (Claims: sub, role, tenantId)
            Python->>Mongo: Log AI Inference outcome='match' & Telemetry
            Python-->>User: HTTP 200: access_token, user metadata
        end
    end
    deactivate Python

    %% Authenticated REST Request with RBAC Guards
    Note over User, DB: Guarded Enterprise Resource Access Sequence
    User->>Nest: GET /api/v1/workers (Bearer token in Authorization header)
    activate Nest
    Nest->>Nest: JwtAuthGuard Decodes & Validates JWT Signature
    Nest->>Nest: RolesGuard Evaluates Role Privilege (Level Check)
    alt JWT Invalid / Expired / Missing
        Nest-->>User: HTTP 401: Unauthorized access
    else Role Hierarchy Violation (e.g. Worker accessing Admin files)
        Nest-->>User: HTTP 403: Forbidden resources
    else Access Authorized
        Nest->>DB: Prisma query to select workers in tenant scope
        DB-->>Nest: Return workforce rows
        Nest->>Mongo: Log audit trail event='WORKFORCE_READ'
        Nest-->>User: HTTP 200: JSON workers array
    end
    deactivate Nest
```

---

## 3. Biometric Enrollment Workflow (Face & Fingerprint)

Biometric onboarding enforces uniqueness within the organizational tenant context to prevent duplicate accounts and secure identity profiles.

```mermaid
flowchart TD
    A([Start Biometric Onboarding]) --> B[Capture Media Frame / Ridge Template]
    
    subgraph Face Enrollment
        B --> C{Media Format Valid?}
        C -- No --> C_Err([Reject: Invalid Base64 Frame])
        C -- Yes --> D[Detect Face & Eye Regions via Haar Cascades]
        D --> E{Face Detected & Centered?}
        E -- No --> E_Err([Reject: Face Undetected])
        E -- Yes --> F[Run Local Passive Liveness Texture Assessment]
        F --> G{Liveness Passed?}
        G -- No --> G_Err([Reject: Spoofing Attempt / Liveness Failure])
        G -- Yes --> H[Generate 512D Mathematical Embedding Vector]
        H --> I[Execute 1:N Global Duplicate Check within Tenant Scope]
        I --> J{Similarity >= 0.72 Exist?}
        J -- Yes --> J_Err([Reject: Biometric Profile Already Linked])
        J -- No --> K[Prisma Raw SQL Execution to Update faceEmbedding pgvector]
    end

    subgraph Fingerprint Enrollment
        B --> L[Enhance Contrast via CLAHE]
        L --> M[Extract Minutiae Paths & Ridge Points via ORB]
        M --> N{Keypoints Count > 10?}
        N -- No --> N_Err([Reject: Low Ridge Contrast / Scanner Noise])
        N -- Yes --> O[AES-256-CBC Encrypt Serialized Keypoint Descriptor]
        O --> P[Query Decrypted Fingerprint Templates for Duplicates]
        P --> Q{Fingerprint Match Found?}
        Q -- Yes --> Q_Err([Reject: Ridge Pattern Already Registered])
        Q -- No --> R[Write Encrypted Template & Set fingerprintRegistered=True]
    end

    K --> S([Onboarding Success: Update User State = REGISTERED / ACTIVE])
    R --> S

    %% Styling
    style C_Err fill:#ffebee,stroke:#ef5350,color:#b71c1c
    style E_Err fill:#ffebee,stroke:#ef5350,color:#b71c1c
    style G_Err fill:#ffebee,stroke:#ef5350,color:#b71c1c
    style J_Err fill:#ffebee,stroke:#ef5350,color:#b71c1c
    style N_Err fill:#ffebee,stroke:#ef5350,color:#b71c1c
    style Q_Err fill:#ffebee,stroke:#ef5350,color:#b71c1c
    style S fill:#e8f5e9,stroke:#66bb6a,color:#1b5e20
```

---

## 4. Workforce Geofenced Attendance Lifecycle

The core operational flow verifies contractor/worker positions relative to allocated branch geofences, scores the biometric trust value, pushes real-time telemetry to dashboards, and handles network disruptions elegantly.

```mermaid
sequenceDiagram
    autonumber
    actor Worker as Mobile / Kiosk Device
    participant ClientDB as IndexedDB (Client Cache)
    participant Nest as NestJS Gateway (3456)
    participant Python as Python FastAPI (8000)
    participant DB as PostgreSQL
    participant WS as WebSocket Gateway (Events)
    participant Dash as Supervisor Dashboards

    Worker->>Worker: Initiate Check-In (Webcam + GPS Coordinates)
    
    alt Device is Offline (navigator.onLine === false)
        Worker->>ClientDB: Store Transaction in "attendance_queue"
        Note over Worker, ClientDB: Web Crypto API AES-GCM Encrypts Record
        ClientDB-->>Worker: Update UI: Check-in cached locally (Offline mode)
    else Device is Online
        Worker->>Nest: POST /api/v1/attendance/check-in (userId, base64Image, GPS, accuracy)
        activate Nest
        
        %% Step 1: Geofence Validation
        Nest->>DB: Query assigned Site coordinates & radius (meters)
        DB-->>Nest: Return Site parameters (Latitude, Longitude, Radius)
        Nest->>Nest: Compute Haversine distance from worker to site
        alt Distance > Site.radius
            Nest->>Nest: Set geofenceStatus = "VIOLATION" & withinFence = false
        else Distance <= Site.radius
            Nest->>Nest: Set geofenceStatus = "VALID" & withinFence = true
        end

        %% Step 2: Biometric Trust Verification Proxy
        Nest->>DB: Fetch saved user vector embedding
        DB-->>Nest: Return faceEmbedding::text
        Nest->>Python: Forward frame + registered embedding proxy
        activate Python
        Python->>Python: Crop, assess liveness texture, and run 1:1 verify match
        Python-->>Nest: Return match=true, confidence, livenessScore
        deactivate Python

        %% Step 3: Composite Trust Scoring & Database Log
        Nest->>Nest: Calculate Composite trust score (confidence, liveness, accuracy)
        Nest->>DB: INSERT into "Attendance" record
        DB-->>Nest: Persistence OK
        
        %% Step 4: Real-time Event Push
        Nest->>WS: Emit event "attendance_update" (new record metadata)
        WS->>Dash: Push WebSockets payload to connected Supervisor streams
        Dash->>Dash: Shimmer pulse transitions to live metric increment (Zero-Mock)

        Nest-->>Worker: HTTP 201: Check-in Confirmed (Details + trustScore)
        deactivate Nest
    end

    %% Sync Queue Sequence
    Note over Worker, Nest: Background Queue Syncing (Network Restored)
    Worker->>Worker: Window triggers 'online' event listener
    activate Worker
    Worker->>ClientDB: Pull all encrypted offline items
    ClientDB-->>Worker: Return array of cipherText + IV
    loop For each offline record
        Worker->>Worker: Decrypt cache data via client Web Crypto
        Worker->>Nest: POST /api/v1/attendance/check-in (Cached transaction payload)
        Nest->>DB: Write retro-timestamped check-in record
        Nest-->>Worker: HTTP 201: Sync Success
        Worker->>ClientDB: Delete synchronized record from IndexedDB Store
    end
    deactivate Worker
```

---

## 5. Platform Governance & Organization Onboarding Pipeline

For multi-tenant SaaS scaling, organization onboarding involves strict reviews, security audits, and automated isolation partitioning.

```mermaid
flowchart TD
    Sub1([Landing Page Registration request]) --> Sub2[User completes Org details & Requested services]
    Sub2 --> Sub3[POST /api/v1/auth/request-access]
    Sub3 --> Sub4[Record inserted into PostgreSQL 'organization_requests' with status = PENDING]
    
    subgraph Platform Head Governance
        Sub4 --> Sub5[Platform Head logs in & opens RoleBasedDashboard]
        Sub5 --> Sub6[Dashboard fetches pending reviews via GET /api/v1/auth/platform/requests]
        Sub6 --> Sub7[Platform Head reviews details & sets 'reviewNotes']
        Sub7 --> Sub8{Approve Tenant?}
        Sub8 -- No --> Sub9[POST /auth/platform/review-request -> status = REJECTED]
        Sub8 -- Yes --> Sub10[POST /auth/platform/review-request -> status = APPROVED]
    end

    subgraph Automated SaaS Provisioning
        Sub10 --> Sub11[POST /api/v1/auth/platform/provision-tenant]
        Sub11 --> Sub12[Prisma generates Tenant instance and isolates organizationCode slug]
        Sub12 --> Sub13[Prisma seeds default administrative user roles for new Tenant scope]
        Sub13 --> Sub14[MongoDB constructs isolation pipelines for audit logging]
    end

    Sub9 --> Sub15([Process Concluded: Notification Email sent])
    Sub14 --> Sub16([Tenant Activated: Organization Admin receives secure onboard credentials])

    %% Styling
    style Sub9 fill:#ffebee,stroke:#ef5350,color:#b71c1c
    style Sub10 fill:#e8f5e9,stroke:#66bb6a,color:#1b5e20
    style Sub16 fill:#e3f2fd,stroke:#42a5f5,color:#0d47a1
```

---

## 6. Zero-Mock AI Analytics & Assistant Engine

The system integrates a strict zero-mock analytical pipeline powered by **Groq LLM API** services to perform workforce queries and predictive insights.

```mermaid
flowchart LR
    User([Supervisor Query Input]) --> UI[Dashboard AI Chat Drawer]
    UI --> Controller[POST /api/v1/ai/query]
    
    subgraph NestJS Core Processing
        Controller --> Guard[Enforce JwtAuthGuard: Must be authenticated role]
        Guard --> Service[AiService.queryWorkforce]
        Service --> QueryDB[Direct PostgreSQL & MongoDB telemetry queries]
        QueryDB --> FormatContext[Map structured data into system prompt context]
    end

    subgraph Analytical Guardrails
        FormatContext --> GroqAPI[Call Groq LLM Endpoint]
        GroqAPI --> SafetyCheck{Prompt Boundaries Satisfied?}
        SafetyCheck -- Violates Guidelines --> FabricateErr[Override: Reject fabrication & request clarification]
        SafetyCheck -- Validates --> GenerateResponse[Synthesize text analysis based on direct metrics only]
    end

    FabricateErr --> UI
    GenerateResponse --> UI
```

---

## 7. Data Lineage & Storage Matrix

The persistence architecture is separated into a transactional layer (PostgreSQL) and an analytical/audit logging layer (MongoDB) to keep processing loops lean and optimized.

| Entity Domain | Primary Storage | Schema / Type | Query Engine / Connector | Security Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Users / Admins** | PostgreSQL | `users` Table | Prisma ORM / Client | Bcrypt password hash, Row-Level isolation |
| **Biometric Face Embeddings** | PostgreSQL | `faceEmbedding` 512D Vector | pgvector raw SQL cosine similarity (`<=>`) | Structured validation (variance check > 1e-4) |
| **Fingerprint Templates** | PostgreSQL | `fingerprintTemplate` | Prisma / Decrypted via AES-256-CBC | Scrypt derived encryption key from JWT_SECRET |
| **Geofenced Sites** | PostgreSQL | `Site` Table | Prisma / Haversine Geo Queries | Circular radius (meters), Lat-Long floating coordinates |
| **Workforce Attendance Logs**| PostgreSQL | `Attendance` Table | Prisma Client | Composite Trust Score validation (confidence + liveness) |
| **Administrative Audits** | MongoDB | `audit_logs` Collection | MongoService / Mongoose | Immutable append-only schema |
| **Inference & Telemetry** | MongoDB | `ai_inference_logs`, `telemetry` | MongoDB Client | Fire-and-forget async logs, no transaction block |
