# Peblo TV - CMS

Internal admin interface for content editors. Lets editors:

- Browse, search, and filter shows/episodes
- Create, edit, and delete shows, seasons, and episodes
- Upload artwork (poster, banner, thumbnail) with strict dimension and file-size validation
- View the validation report and run publish jobs (admin role only)

## Stack
- React 18 + TypeScript + Vite
- TanStack Query for server state
- React Hook Form (for any form-heavy flows you add)
- Plain CSS (no UI library — focus on usability for non-technical editors)

## Development

```bash
npm install
npm run dev
# Default dev URL: http://localhost:3000
```

The Vite dev server proxies `/api` to `http://localhost:8000` (the API).

## Production build

```bash
npm run build
# Outputs to dist/
```

## Routes

| Path | Description |
|---|---|
| `/login` | Sign in |
| `/shows` | List shows with search, section, status filters |
| `/shows/:id` | Show detail — edit, upload artwork, manage seasons/episodes |
| `/episodes` | Cross-show episode list with filters |
| `/publish` | Admin only — validation report + publish trigger |
