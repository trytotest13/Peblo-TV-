# Peblo TV — Viewer

Netflix-style browse UI for the published catalogue. Reads **only** the
`/catalog` and `/catalog/search` endpoints — never admin endpoints.

## Features
- **Hero**: top featured show with banner artwork
- **Rows by section**: featured, series, minisodes, songs
- **Show detail**: seasons/episode list with thumbnails, language options for grouped episodes, and posters
- **Search + filters**: search across title, synopsis, and categories; filter by section and language
- **Skips Season 0** (trailers) by convention from `reference.json`
- **Right artwork per surface**: banner for hero, poster for rows, thumbnail for episode lists
- **Loading skeletons** and graceful empty/loading/error states

## Stack
- React 18 + TypeScript + Vite
- TanStack Query

## Development

```bash
npm install
npm run dev
# Default dev URL: http://localhost:5173
```

## Production build

```bash
npm run build
# Outputs to dist/
```

## Note on slow images

The viewer uses `loading="lazy"` on all `<img>` tags below the fold and
fades the hero image in on `load` (via CSS). No spinners or
blocking states — the layout stays usable even when artwork is slow.

## Environment

`VITE_API_URL` — where the API is reachable. Defaults to `/api` (proxied
via Vite in dev to the API service).
