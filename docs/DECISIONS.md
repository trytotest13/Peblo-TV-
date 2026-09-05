# Part E — Written reasoning

## 1. How publishing is atomic — and what happens if the process dies mid-publish

The publish job writes the new catalogue to a **temporary file** first
(`catalog.json.tmp`), then `os.replace`s it over the live `catalog.json`.
`os.replace` is atomic on POSIX (rename(2)) and on Windows
(MoveFileEx with `MOVEFILE_REPLACE_EXISTING`). The viewer always reads
the *current* `catalog.json` — it never opens a half-written file.

If the process dies after the build but before the rename, the live
`catalog.json` is untouched and the previous run stays in effect. The
`PublishRun` row is recorded with `outcome="failed"` and an error
message. The next publish starts fresh.

## 2. Storage abstraction — local ↔ R2

`app/services/storage.py` defines a `StorageBackend` base class with
`save`, `delete`, `url` methods. Two implementations:

- `LocalStorage` — writes to `LOCAL_STORAGE_PATH`; URLs are `/media/...` served by FastAPI StaticFiles.
- `R2Storage` — uses `boto3` with a Cloudflare R2 endpoint, public URLs via `R2_PUBLIC_BASE_URL`.

Switch with `STORAGE_BACKEND=local|r2` in `.env`. The rest of the
codebase never imports the implementation directly — only the factory
function. To move to R2 in production: set the env vars, change
`STORAGE_BACKEND=r2`, redeploy. No code changes.

We could add a migration script that re-uploads existing local files to
R2 if we want zero-downtime, but the rest of the system is unchanged.

## 3. Search — current implementation, when it breaks, what's next

Right now `/catalog/search` reads the published `catalog.json` from disk
(or rebuilds it from the DB on the fly if no publish has run yet) and
filters in Python. This is **O(n)** in the size of the catalogue and
perfectly fine for a few hundred shows / a few thousand episodes.

Where it stops working:
- ≥ ~10,000 shows, where every search iterates the full catalogue and
  blocks the API event loop.
- Latency-sensitive clients where the per-request work of parsing the
  whole file is unacceptable.

What's next:
- **Server-side indexing** — Postgres full-text search (`tsvector` on
  title/synopsis, GIN index) and an index on `categories`/`section`/
  `language`. Query becomes an indexed DB read, not a file scan.
- **Redis** cache of the published catalogue document for `/catalog`,
  with the DB as the source of truth for search.
- **Algolia/Meilisearch** — when the editorial team wants typo-tolerant
  search, faceting, and admin-grade ranking. Would be added as a
  publishing *side-effect* in the publish job.

## 4. Why a pre-published catalogue file instead of querying the DB per request?

Three reasons:

1. **Viewer speed and isolation** — the viewer UIs (and CDN) read a
   single static JSON. No DB connection, no schema, no auth roundtrip
   per request. CDNs and edge caches work the moment you add cache
   headers.
2. **Predictable production behaviour** — the viewer never sees a
   partial publish or a slow-running migration. What was live at
   publish time stays live until the next successful publish.
3. **No admin endpoint exposure** — the viewer never calls admin
   routes. The catalogue is a separate surface, and the storage
   abstraction makes it possible to serve from R2 directly.

Where it bites:
- **Stale data between publishes** — the viewer is at most "one publish
  behind" the database. We mitigate by making publish cheap (idempotent
  and sub-second for hundreds of shows) and by including a
  `generated_at` timestamp in the catalogue.
- **Search precision** — anything that's not in the file is invisible
  to the viewer. We mitigate by always serving the most recent
  *published* state, never a partial one.
- **Schema evolution** — every catalogue shape change is a
  coordinated deploy of API + viewer. We mitigate by versioned
  responses (`generated_at` and a schema version field) and a
  documented deprecation window.

## 5. What I left out and why

- **CI deploy step** — written as a comment block, not a real job.
  There's no cloud to deploy to, and the actual cloud commands depend
  on the platform. I scaffolded the image-build step so the deploy
  diff is small.
- **React Hook Form + Zod** — CMS forms use hand-rolled `useState`
  validation; `react-hook-form`, `zod`, `@hookform/resolvers`, and
  `clsx` were removed from `cms/package.json` as unused deps.

## 5b. Migrations and env validation

- **Alembic, not `create_all()`** — app startup runs `alembic upgrade
  head` in `docker-entrypoint.sh`, then idempotent seed scripts.
  `Base.metadata.create_all()` appears only in `tests/conftest.py`
  (in-memory SQLite fixtures). Migrations keep deploy history explicit
  and reviewable; `create_all()` can't roll back a bad deploy.
- **Fail-fast env validation** — `JWT_SECRET` and
  `BOOTSTRAP_ADMIN_PASSWORD` have no production defaults:
  `docker-compose.yml` marks them `:?` (required), and `get_settings()`
  refuses to boot in `APP_ENV=production` with the shipped dev values.
  A forgotten secret is a loud startup error, not a silently insecure
  service. Dev-only defaults exist so `docker compose up` works for a
   reviewer with just `.env.example` copied over.

## 5c. Stretch goals (implemented)

All three optional stretch goals were implemented:

- **Versioned catalogue + rollback**: Each successful publish writes a
  versioned copy (`catalog.json.v{run_id}.json`). `POST /catalog/rollback/{run_id}`
  restores from that version atomically. Old (pre-versioning) publishes
  return 410 Gone.
- **Publish diff**: `GET /catalog/diff/{run_id}` returns added/removed/changed
  shows between the current live catalogue and a previous publish.
- **Audit log**: Every show/season/episode create/update/delete writes a row
  to `audit_logs` with the actor's email and before/after JSON. Available
  at `GET /admin/audit-log` with optional filters by entity type, entity ID,
  or actor email.

## 5d. Publish queue, schedule, history (implemented)

The `/publish` CMS page grew three tabs backed by `app/routers/publish.py`
(tables `publish_jobs` + `publish_schedules`, migration `0004`):

- **Validation gate, not confirmation dialogs.** `POST /publish/jobs/{id}/publish`
  recomputes validation live from the validation report and returns 409 with
  the issue list when blocked. The button being disabled is UX; the 409 is
  the safety. No confirm dialog on publish — the gate is the safety.
- **Queue auto-seeds from draft content.** Draft shows/episodes are, by
  definition, waiting to publish, so `GET /publish/jobs` creates a pending
  row per draft (idempotent, never duplicates). Validation is computed on
  read, never stored — stored status only tracks lifecycle
  (validated/issues/publishing/published/cancelled/failed).
- **Editors can publish through the queue.** The raw catalogue push
  (`POST /catalog/publish`) stays admin-only, but queue/schedule/history
  are editor+ — the content team ships without engineering help, and the
  validation gate keeps them from shipping broken content.
- **Inline execution, no worker.** Publish runs inside the request: flip
  status + audit row, then reuse the catalogue-push function so file-writing
  stays in one place. A Redis/ARQ worker is still the right call once
  publishes get slow (see below) — this is marked as the known ceiling.
- **Schedule sweeps on read.** Past-due rows execute when the schedule is
  fetched; failures stay scheduled with `last_error` instead of silently
  flipping. No cron needed at this scale.
- **History unions both sources.** Catalogue runs (`publish_runs`) and
  terminal jobs appear newest-first with cursor pagination; failed rows
  carry `error_detail`.

## 5e. What I'd do with more time

- **Background worker (Redis/ARQ)** — move publish off the request
  cycle so large catalogues can't time out the admin's HTTP call.
- **Rate limiting** — per-IP throttling on `/auth/login` and
  `/catalog/search` (e.g. slowapi) to blunt brute-force and scrape loops.
- **Production frontend image** — multi-stage Dockerfile serving the
  Vite build via nginx instead of the dev server.
- **Playwright smoke test** — one end-to-end pass (login → publish →
  viewer shows new content) in CI against the composed stack.

## 6. AI tools used

I used Claude (Anthropic) to scaffold the boilerplate and check
syntax. I accepted the structural skeletons (file layout, schema
fields, FastAPI router shape) and rewrote or rejected:

- The artwork validation message wording — the AI's first pass used
  engineering jargon ("Invalid aspect ratio: expected 2.0, got 1.78").
  I rewrote to "Image is 1920×1080 (ratio 1.78). Required ratio is
  2:3 (≈0.67). Please resize or crop." because the challenge
  explicitly notes editors are non-technical.
- The publish atomicity — the AI's first draft wrote the new file
  directly to `catalog.json`, which would leak a half-written
  document to the reader. I added the write-temp-then-rename pattern.
- The search implementation — the AI's first pass did client-side
  filtering, which the challenge explicitly calls out as a demerit
  ("search done in the browser over the whole catalogue with no
  comment on scale"). I moved it server-side and documented the
  scale-out path in this file.

## Time spent (rough)

- Reading + design: 1 hour
- Backend: 3 hours
- Docker + CI: 30 minutes
- Docs (this file): 30 minutes
- (Part B + C: ~2 hours — see their READMEs)
- Phase 2 polish (search fixes, CMS debounce, CI lint jobs): 30 minutes
- Stretch goals (versioned catalogue, diff, audit log, tests): 45 minutes

## 7. Production Readiness & Legal Audit

I performed a systematic production-readiness audit across the CMS, Viewer, and Backend:

- **Centralized State Components**: Created `<StatePage>`, `<EmptyState>`, `<ErrorState>`, `<LoadingState>`, `<OfflineBanner>`, `<NotFoundPage>`, and `<ErrorBoundary>` components for both CMS and Viewer apps.
- **Legal & Public Pages**: Added Viewer routes for `/about`, `/terms`, `/privacy` (marked for owner legal review), `/cookies`, `/accessibility`, `/help`, and `/report`. Connected `/report` to a real FastAPI backend router (`POST /report`) with Pydantic validation and unit tests.
- **CMS Staff Pages**: Added `/settings` (Account Settings) and `/audit-log` (Audit Log viewer backed by backend `GET /admin/audit-log`).
- **Child Privacy Compliance (DPDP Act)**: Avoided invented compliance statements. Created `docs/PRODUCTION_PAGE_AUDIT.md` documenting data inventory and consolidated missing owner inputs.
