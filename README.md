# Peblo TV Mini

A miniature streaming-mode platform: internal CMS for content editors, a
publishable JSON catalogue, and a Netflix-style viewer UI.

```
CMS (React + TS) ──► API (FastAPI + Postgres) ──► publish job ──► catalog.json
                                                                       │
                                         Viewer UI (React + TS) ◄──────┘
```

## Quick start

### Option 1: Docker (recommended)

```bash
# 1. Copy env
cp .env.example .env

# 2. Bring up everything
docker compose up --build

# 3. Seed the database (one-off, after the API is healthy)
docker compose exec api python seed.py

# 4. Seed artwork (copy known-good images to all shows/episodes)
docker compose exec api python seed_artwork.py
```

After `docker compose up` you should be able to reach:

- **API**:      <http://localhost:8000> (docs at `/docs`)
- **CMS**:      <http://localhost:3000>
- **Viewer**:   <http://localhost:5173>

Default admin (created automatically on first boot):
- email:    `admin@peblo.local`
- password: `admin123`

### Option 2: Local development (no Docker)

```bash
# Backend
cd backend
python -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/alembic upgrade head
./venv/bin/python seed.py
./venv/bin/python seed_artwork.py
./venv/bin/uvicorn app.main:app --reload

# CMS
cd cms
npm install
npm run dev

# Viewer
cd viewer
npm install
npm run dev
```

Note: When running locally, set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/peblo` and `STORAGE_BACKEND=local`.

## Architecture

### Backend (`backend/`)

- FastAPI + SQLAlchemy 2 (async) + Postgres
- JWT auth, roles: `editor` (CRUD) vs `admin` (CRUD + publish)
- Storage abstraction (`app/services/storage.py`) — swap local ↔ R2 by setting `STORAGE_BACKEND`
- Artwork validation in `app/services/validation.py` — three sizes strictly enforced
- Atomic publish job in `app/routers/catalog.py` — write to temp, then `os.replace` over the live file

### Data model

- `shows` (1) ─► `seasons` (1) ─► `episodes` (M) ─► `artwork` (M)
- `users`, `publish_runs`
- Key constraints: `(content_group, language)` unique on episodes, `(show_id, season_number)` unique on seasons

### Conventions enforced from `reference.json`

- **Season 0** = trailers — never appears in viewer as a normal season
- **`content_group`** — episodes sharing a `content_group` are language variants and collapse to one catalogue entry

## Endpoints (selected)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | none | Returns JWT |
| GET | `/auth/me` | user | Current user |
| GET/POST/PATCH/DELETE | `/shows` | editor+ | CRUD |
| GET/POST/PATCH/DELETE | `/seasons` | editor+ | CRUD |
| GET/POST/PATCH/DELETE | `/episodes` | editor+ | CRUD |
| POST | `/artwork/upload` | editor+ | Strict validation |
| GET | `/catalog` | none | What the viewer reads |
| GET | `/catalog/search` | none | Composable filters |
| POST | `/catalog/publish` | admin | Builds `catalog.json` |
| GET | `/catalog/publish-runs` | admin | History |
| GET | `/admin/validation-report` | admin | What blocks publish |
| GET | `/health` | none | Liveness |

## Testing

```bash
cd backend
pytest -v
```

26 tests cover: authentication, artwork validation, catalog building, validation reports, and smoke tests.

## Environment variables

Required:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@localhost:5432/peblo` |
| `JWT_SECRET` | Signing key for JWTs (must be long random string in production) | See `.env.example` |
| `STORAGE_BACKEND` | `local` or `r2` for storage implementation | `local` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key (only if `STORAGE_BACKEND=r2`) | — |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key (only if `STORAGE_BACKEND=r2`) | — |
| `R2_BUCKET` | Cloudflare R2 bucket name (only if `STORAGE_BACKEND=r2`) | `peblo-artwork` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID (only if `STORAGE_BACKEND=r2`) | — |

Optional:

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | (none) | Database password |
| `POSTGRES_DB` | `peblo` | Database name |
| `STORAGE_PATH` | `./storage` | Local storage directory |
| `API_URL` | `http://localhost:8000` | API base URL |
| `VITE_API_PROXY_TARGET` | `http://api:8000` (Docker) or `http://localhost:8000` (local) | CMS/Viewer API proxy target |

### Creating a test user

```python
from app.db import AsyncSessionLocal
from app.models.user import User
from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], bcrypt_rounds=12).hash("your-password")
user = User(email="editor@example.com", role="editor", hashed_password=pwd)
session = AsyncSessionLocal()
session.add(user)
await session.commit()
```

## Decisions & trade-offs

See `docs/DECISIONS.md` (Part E of the challenge).

## CI

`.github/workflows/ci.yml` runs:

1. Backend lint + tests (with Postgres service container)
2. Docker image builds (deploy step is scaffolded but commented — see file)

## Phase 1 Time Breakdown

| Task | Time |
|---|---|
| Git init + first commit | ~15 min |
| Artwork seeding | ~10 min |
| Backend tests (26 tests) | ~15 min |
| ESLint + Prettier (CMS + Viewer) | ~10 min |
| README documentation | ~10 min |
| **Total Phase 1** | **~1.5 hours** |

## Frontend development

Both `cms/` and `viewer/` are React 18 + TypeScript + Vite projects with:

- TanStack Query for data fetching
- React Router v6 for routing
- Tailwind CSS for styling
- ESLint + Prettier for code quality

Run in each directory:

```bash
npm install
npm run dev        # Start dev server
npm run lint       # Check code
npm run format     # Auto-format code
npm run format:check  # Check formatting
```

## Security notes

- Never commit `.env` — use `.env.example` template
- `JWT_SECRET` must be a long random string in production (use `python -c "import secrets; print(secrets.token_urlsafe(64))"`)
- Cloudflair R2 secrets (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) must be stored in your platform's secret manager
- Storage backend files must be gitignored
- Role-based access control is enforced server-side for all protected endpoints