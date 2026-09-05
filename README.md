# Peblo TV Mini

A miniature streaming-mode platform: internal CMS for content editors, a publishable JSON catalogue, and a Netflix-style viewer UI.

```
CMS (React + TS) ──► API (FastAPI + Postgres) ──► publish job ──► catalog.json in storage
                                                                       │
                                          Viewer UI (React + TS) ◄─────┘
```

---

## 1. Quick Start

### Docker (Recommended)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start all services — database migrations, seeding, and catalogue publish run automatically
docker compose up --build
```

After the API container health check passes (~10–15 seconds for initial database seeding):

- **Viewer UI**: [http://localhost:5173](http://localhost:5173)
- **CMS Admin**: [http://localhost:3000](http://localhost:3000)
- **FastAPI API**: [http://localhost:8000](http://localhost:8000) (Interactive Swagger Docs at `/docs`)

**Default Admin Credentials (Auto-seeded)**:
- Email: `admin@peblo.local`
- Password: `admin123`

### Local Development (Without Docker)

```bash
# Backend (Python 3.11+ / FastAPI)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python seed.py
python seed_artwork.py
uvicorn app.main:app --reload

# CMS Admin Portal
cd ../cms
npm install
npm run dev

# Viewer Browse App
cd ../viewer
npm install
npm run dev
```

---

## 2. Architecture & Data Model

### Backend (`backend/`)
- **Framework**: FastAPI + SQLAlchemy 2 (Async) + PostgreSQL / Supabase
- **Authentication & RBAC**: JWT bearer auth with server-side role enforcement (`editor` vs `admin`)
- **Storage Abstraction**: `StorageBackend` interface in `app/services/storage.py` (pluggable `LocalStorage` and `R2Storage`)
- **Artwork Validation**: Enforces aspect ratio (2:3 poster, 16:9 banner/thumb), exact pixel dimensions, and 200 KB max file size in `app/services/validation.py`

### Data Model
- `shows` (1) ──► `seasons` (1) ──► `episodes` (M) ──► `artwork` (M)
- `users`, `publish_runs`, `audit_logs`, `publish_jobs`, `publish_schedules`, `reports`
- **Key Constraints**: `(content_group, language)` unique on episodes, `(show_id, season_number)` unique on seasons

### Core Catalogue Conventions (`reference.json`)
- **Season 0 (Trailers)**: Reserved exclusively for show trailers — filtered out from standard season listings in the Viewer UI.
- **`content_group` Collapsing**: Episodes sharing a `content_group` represent language variants (e.g. English / Hindi) of the same episode. The publish job collapses them into a single catalogue entry with an array of available `languages`.

---

## 3. Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/auth/login` | None | Authenticate user and receive JWT |
| GET | `/auth/me` | User | Get active user profile |
| GET/POST/PATCH/DELETE | `/shows` | Editor / Admin | Show CRUD operations |
| GET/POST/PATCH/DELETE | `/seasons` | Editor / Admin | Season CRUD operations |
| GET/POST/PATCH/DELETE | `/episodes` | Editor / Admin | Episode CRUD operations |
| POST | `/artwork/upload` | Editor / Admin | Validates and uploads show/episode artwork |
| GET | `/catalog` | None | Serves pre-published `catalog.json` |
| GET | `/catalog/search` | None | Composable search (`q`, `category`, `language`, `section`) |
| POST | `/report` | None | Submit content/playback concern report |
| POST | `/admin/catalog/publish` | Admin | Atomic catalogue publish job |
| GET | `/admin/catalog/publish-runs` | Admin | Catalogue publish history |
| GET | `/admin/validation-report` | Admin | Validation issues blocking publication |
| GET | `/admin/audit-log` | Admin | Activity audit trail with before/after snapshots |
| GET | `/health` | None | Liveness health check endpoint |

---

## 4. Part E — Technical Decisions & Written Reasoning

### 4.1 Atomic Publishing & Crash Resilience
- **Mechanism**: The publish job (`POST /admin/catalog/publish`) queries published database records, validates content group language collapsing, generates the complete JSON structure, and writes to a temporary file (`catalog.json.tmp.<run_id>`). Once the write and disk sync complete, an atomic file rename (`os.replace`) swaps the temporary file over the live `catalog.json`.
- **Crash Recovery**: If the process terminates mid-publish (e.g., server crash or power loss), the live `catalog.json` remains untouched and fully operational. Readers never see a half-written file or corrupt JSON. Stray `.tmp` files are cleaned up on service restart.

### 4.2 Storage Abstraction (Local Disk ↔ Cloudflare R2)
- **Design**: Implemented an abstract base class `StorageBackend` with concrete implementations `LocalStorage` (for local dev/Docker) and `R2Storage` (for production using `aioboto3`).
- **Swapping Storage**: Switching environments requires changing a single environment variable (`STORAGE_BACKEND=r2`) alongside standard credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ACCOUNT_ID`). Zero code changes are required in application services or router handlers.

### 4.3 Search Implementation & Scaling Strategy
- **Current Approach**: `GET /catalog/search` performs composable in-memory filtering over the pre-published catalogue structure (`q` matching show title, episode title, and category, combined with `category`, `language`, and `section` filters).
- **Scale Ceiling**: In-memory JSON filtering works seamlessly up to ~50,000 episodes (~15–20 MB payload). Beyond this limit, JSON deserialization overhead and memory allocation begin to impact request latency.
- **Next Step for Scale**: At scale (>100k records), search transitions to PostgreSQL Full-Text Search (`tsvector` indexes) or a dedicated search indexer (Meilisearch / Elasticsearch) backed by API pagination.

### 4.4 Pre-Published Catalogue vs. Dynamic Database Queries
- **Why Pre-Publish?**: Serving a pre-published `catalog.json` decouples reader traffic from the primary database. Edge CDNs (e.g., Cloudflare) can cache `catalog.json` at zero database query cost, ensuring sub-10ms response times for millions of concurrent child viewers.
- **Where It Bites Us**: Stale data latency. Content edits in the CMS are not reflected live in the viewer until an editor triggers a publish run.

### 4.5 What Was Left Out & AI Usage
- **Omissions**: Omitted physical shipping, return policies, and web payment checkout flows. Reason: Peblo TV is a digital video learning platform; subscription billing occurs natively via the Google Play Store client.
- **AI Tooling**: Utilized coding assistants for boilerplate generation (Pydantic schema definitions, initial migration scripts, test mocks). All generated validation logic, atomic file locks, and state boundaries were manually reviewed and verified against test suites.

---

## 5. Verification & Testing

### Test Suite Execution

```bash
# Backend pytest suite (48 tests covering Auth, Artwork, Publish, Search, Reports, Audit Logs)
cd backend && pytest -v

# CMS Admin Vitest suite & Type Check
cd cms && npx tsc --noEmit && npx vitest run

# Viewer UI Vitest suite & Type Check
cd viewer && npx tsc --noEmit && npx vitest run
```

### Verification Metrics
- **Backend**: 48/48 tests passing (0 warnings)
- **CMS**: 3/3 tests passing, 0 TypeScript errors
- **Viewer**: 22/22 tests passing, 0 TypeScript errors

---

## 6. Secrets Management & Alerting

### Production Secrets
- Secrets are injected strictly via environment variables (never committed to git).
- **CI/CD**: Injected via GitHub Actions Encrypted Secrets.
- **Production Infrastructure**: Retrieved at container startup via AWS Secrets Manager / HashiCorp Vault.

### Observability & Alerting
- **Primary Alert Metric**: `publish_failure_rate` (Alert when 2+ consecutive `POST /admin/catalog/publish` runs fail). If publish fails, editors are blocked from releasing new shows.

---

## 7. Implemented Stretch Features

- **Versioned Catalogue & Rollback**: Each successful publish archives a snapshot (`catalog.json.v{run_id}.json`). `POST /catalog/rollback/{run_id}` atomically restores any historical version.
- **Publish Diff**: `GET /catalog/diff/{run_id}` computes added, updated, and removed shows between the active catalogue and a target publish run.
- **Audit Logging**: All show, season, and episode mutations record before/after JSON snapshots to `audit_logs` table (`GET /admin/audit-log`).#   P e b l o - T V -  
 