# Peblo TV — Architecture & Go-Live Technical Decisions

**Project**: Peblo TV Mini (CMS + Viewer + Backend)  
**Operator**: RuruVerse Studio Pvt. Ltd.  
**Date**: September 5, 2026  

---

## 1. Architectural & Safety Decisions

### 1.1 Content Concern & Reporting System
- **Decision**: Implemented dedicated `/report` page in `viewer` backed by `POST /report` FastAPI endpoint and Pydantic validation schema.
- **Rationale**: Children's digital safety compliance requires a direct mechanism for parents to flag inappropriate content or playback errors.
- **Database Schema**: Added `reports` table via Alembic migration (`id`, `category`, `target_id`, `reporter_email`, `description`, `created_at`, `status`).

### 1.2 Legal & Privacy Compliance Framework
- **Decision**: Built verified `Privacy.tsx`, `Terms.tsx`, `Cookies.tsx`, `About.tsx`, `Help.tsx`, and `Accessibility.tsx` pages in `viewer`.
- **Handling Unfilled Legal Facts**: Explicitly marked legal facts requiring operator sign-off (DPDP parental consent verbiage, official support emails) as `BLOCKED_BY_MISSING_INFORMATION` in `docs/PRODUCTION_PAGE_AUDIT.md` rather than inventing false claims.

### 1.3 CMS Design System & Select Control Consistency
- **Decision**: Normalized dropdown styling across CMS (`neko-select`) to standard 38px-40px heights and dark surface background (`var(--color-surface)`).
- **Rationale**: Eliminates oversized AI-generated component artifacts and browser native blue select popups.

### 1.4 Authentication & Session UX
- **Decision**: Separated guest view from authenticated user profile in `viewer`. Guest dropdown displays `Sign In / Register` rather than `Sign Out`.
- **CMS Session Management**: JWT 401 response interceptor in `cms/src/lib/api.ts` cleanly invalidates local token and redirects to `/login` without redirect loops.

---

## 2. Verification & Exclusions

- **E-Commerce / Payment Pages**: Excluded refund, shipping, and payment success/failure pages (billing is handled natively via Google Play Store mobile client).
- **Audit Logging**: Backed by FastAPI `GET /admin/audit-log` endpoint reading DB `audit_logs` table.
