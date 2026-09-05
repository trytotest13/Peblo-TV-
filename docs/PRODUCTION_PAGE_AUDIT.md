# Production Page & State Audit Document

**Project**: Peblo TV Mini (CMS, Viewer & Backend)  
**Operator Legal Name**: RuruVerse Studio Pvt. Ltd. (Pending Legal Review confirmation)  
**Date**: September 5, 2026  

---

## 1. Audit Matrix

| Category | Page or State | Status | Evidence (File Paths / Endpoints / Routes) | Applicability Reason | Required Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CMS** | 404 Route Catch-All | `EXISTS_AND_ADEQUATE` | `cms/src/App.tsx#L55`, `cms/src/components/StateComponents.tsx` | Internal staff portal requires 404 fallback for mistyped URLs. | Created reusable `<NotFoundPage>` component mounted at `*` route in `cms/src/App.tsx`. |
| **CMS** | 500 Error Boundary | `EXISTS_AND_ADEQUATE` | `cms/src/App.tsx#L32`, `cms/src/components/StateComponents.tsx` | Catches unhandled UI render crashes without crashing the browser session. | Wrapped root CMS router in `<ErrorBoundary>` component. |
| **CMS** | Session Expired & JWT Handling | `EXISTS_AND_ADEQUATE` | `cms/src/lib/api.ts#L24-L28` | JWT expiry (401/403) automatically clears token and redirects to `/login`. | Verified 401 handling in `api.ts` clears `peblo_token` and redirects cleanly to `/login`. |
| **CMS** | Reusable Loading / Error / Empty States | `EXISTS_AND_ADEQUATE` | `cms/src/components/StateComponents.tsx` | Standardized state components improve developer UX and UI consistency. | Implemented `<LoadingState>`, `<ErrorState>`, and `<EmptyState>` components in `cms/src/components/StateComponents.tsx`. |
| **CMS** | Account Settings | `EXISTS_AND_ADEQUATE` | `cms/src/pages/AccountSettings.tsx`, route `/settings` | Staff users can view profile information, role, and security details. | Created `AccountSettings.tsx` and mounted route in `cms/src/App.tsx`. |
| **CMS** | Audit Logging | `EXISTS_AND_ADEQUATE` | `backend/app/routers/admin.py#L29-L55`, `cms/src/pages/AuditLog.tsx`, route `/audit-log` | Backend logs all CRUD operations (`AuditLog` model). Admin staff need visual history. | Implemented `AuditLog.tsx` page backed by `GET /admin/audit-log` endpoint. |
| **Viewer** | About Page | `EXISTS_AND_ADEQUATE` | `viewer/src/pages/About.tsx`, route `/about` | Explains Peblo TV product scope for kids and parents without inventing company facts. | Created `About.tsx` page and mounted in `viewer/src/App.tsx` and `Footer.tsx`. |
| **Viewer** | Terms of Service | `EXISTS_AND_ADEQUATE` | `viewer/src/pages/Terms.tsx`, route `/terms` | Platform terms covering child safety and content use. | Created `Terms.tsx` and mounted route in `viewer/src/App.tsx`. |
| **Viewer** | Privacy Policy | `BLOCKED_BY_MISSING_INFORMATION` | `viewer/src/pages/Privacy.tsx`, route `/privacy` | Requires confirmed data retention periods and DPDP verifiable parental consent review. | Built `Privacy.tsx` layout reflecting actual data inventory (auth, preferences, storage). DPDP sign-off checklist: <br/> [ ] Legal counsel review of parental-consent section in Privacy.tsx <br/> [ ] Owner confirms operator legal name + jurisdiction <br/> [ ] Owner confirms data retention periods (esp. voice/progress data) <br/> [ ] Effective date set <br/> [ ] Verbiage signed off → remove this marker |
| **Viewer** | Cookie & Storage Policy | `EXISTS_AND_ADEQUATE` | `viewer/src/pages/Cookies.tsx`, route `/cookies` | Explains essential local storage keys (`peblo_token`, `peblo_prefs`, `peblo_my_list`). | Created `Cookies.tsx` detailing essential storage usage (no ad cookies used). |
| **Viewer** | Accessibility Statement | `EXISTS_AND_ADEQUATE` | `viewer/src/pages/Accessibility.tsx`, route `/accessibility` | Honest declaration of WCAG contrast, ARIA labels, and keyboard navigation. | Created `Accessibility.tsx` statement page. |
| **Viewer** | Help & FAQ | `EXISTS_AND_ADEQUATE` | `viewer/src/pages/Help.tsx`, route `/help` | Answers questions regarding audio language selection, saving shows, and content safety. | Created `Help.tsx` page. |
| **Viewer** | Content Concern / Report Form | `EXISTS_AND_ADEQUATE` | `viewer/src/pages/Report.tsx`, `backend/app/routers/report.py`, route `/report` | Essential for children's product safety allowing parents to flag content/playback issues. | Created `Report.tsx` frontend page and `/api/report` FastAPI backend router with unit tests. |
| **Viewer** | 404 Catch-All & 500 Error Boundary | `EXISTS_AND_ADEQUATE` | `viewer/src/components/StateComponents.tsx`, `viewer/src/App.tsx` | Provides friendly kid-appropriate fallback for non-existent routes and UI failures. | Created `<NotFoundPage>` and `<ErrorBoundary>` components. |
| **Viewer** | Offline / Retry State | `EXISTS_AND_ADEQUATE` | `viewer/src/components/StateComponents.tsx` | Handles network interruption during video browsing gracefully. | Created `<OfflineBanner>` component for connectivity retry. |
| **Backend** | Report Endpoint | `EXISTS_AND_ADEQUATE` | `backend/app/routers/report.py`, `backend/tests/test_report.py` | Receives and validates content concern reports via Pydantic model (`POST /report`). | Created router, registered in `main.py`, and added unit tests in `test_report.py`. |
| **E-Commerce** | Refund / Shipping / Return Policies | `NOT_APPLICABLE` | Codebase scan | Peblo TV is a digital content platform; no physical goods or shipping exists. | Excluded from build. |
| **Payments** | Payment Checkout / Success Pages | `NOT_APPLICABLE` | Codebase scan | No in-web payments exist; app billing occurs via Google Play Store / mobile store. | Excluded from build. |

---

## 2. Missing Owner Information (Consolidated Question List)

Before legal pages and compliance declarations can be marked final for public release, the owner must confirm the following 7 items:

1. **Confirmed Operator Legal Name & Jurisdiction**: Is "RuruVerse Studio Pvt. Ltd." registered in Bengaluru/Karnataka, India?
2. **Official Contact Emails**: Support, Privacy, and Content Safety email addresses (e.g. `support@mypeblo.com`, `privacy@mypeblo.com`).
3. **Effective Date**: Official effective date for Terms of Service & Privacy Policy.
4. **Data Retention Periods**: Specific retention duration for child progress logs and user account records.
5. **Third-Party Processors**: Confirmed list of active production service providers (e.g., Supabase PostgreSQL, Cloudflare R2, ElevenLabs, Gemini).
6. **Viewer Account Policy**: Whether viewer accounts remain optional or will require mandatory verifiable parental consent (DPDP Act compliance).
7. **Play Store / Store Disclosures**: Linkage to Google Play Store developer disclosure pages if applicable.
