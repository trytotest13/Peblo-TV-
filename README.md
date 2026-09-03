# Peblo TV Mini

A miniature streaming-mode platform: internal CMS for content editors, a
publishable JSON catalogue, and a Netflix-style viewer UI.

```
CMS (React + TS) ──► API (FastAPI + Postgres) ──► publish job ──► catalog.json
                                                                          │
                                          Viewer UI (React + TS) ◄────────┘
```

## Quick start

```bash
# 1. Copy env
cp .env.example .env

# 2. Bring up everything
docker compose up --build

# 3. Seed the database (one-off, after the API is healthy)
docker compose exec api python seed.py
```

After `docker compose up` you should be able to reach:

- **API**:      <http://localhost:8000> (docs at `/docs`)
- **CMS**:      <http://localhost:3000>
- **Viewer**:   <http://localhost:5173>

Default admin (created automatically on first boot):
- email:    `admin@peblo.local`
- password: `admin123`

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

## Decisions & trade-offs

See `docs/DECISIONS.md` (Part E of the challenge).

## Environment variables

See `.env.example`. In production, store these in your platform's secret
manager (AWS Secrets Manager / SSM, GCP Secret Manager, GitHub Actions
secrets). Never commit the real `.env`.

## CI

`.github/workflows/ci.yml` runs:
1. Backend lint + tests (with Postgres service container)
2. Docker image builds (deploy step is scaffolded but commented — see file)
