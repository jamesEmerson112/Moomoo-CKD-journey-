# Moomoo CKD Journey Monitor

Public, read-only monitoring website for Momoo's CKD journey using a content-as-code model.

## What this implements

- Single-page public quick view at `/`
- Deterministic NLP issue extraction from text notes
- 7-day recent-issues list and stacked issue trend chart
- Soft alert computation from thresholds
- Unified chronology stream (clinical events + milestone logs + daily life)
- RAG-ready context events feed
- Strict content validation during build

## Architecture

- Framework: Next.js App Router + TypeScript
- UI: Tailwind CSS + Recharts
- Data source: repository JSON content files (no DB/auth runtime)
- Validation: Zod schemas

## Canonical content files

- `content/logs.json`
- `content/daily-life.json`
- `content/lexicon.json`
- `content/thresholds.json`
- `content/clinical-events.json`

All runtime reads derive from those files.

## App routes

- `/` canonical one-page quick view (`?range=7d|30d|90d`)
- `/dashboard` redirects to `/` (preserves valid `range`)
- `/timeline` redirects to `/`
- `/login` redirects to `/?notice=read-only`
- `/app/*` redirects to `/?notice=read-only`

## API routes

- `GET /api/public/dashboard?range=7d|30d|90d`
- `GET /api/public/logs?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/public/daily-life?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/public/clinical-events?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/context/events?from=&to=`
- `GET /api/alerts/current`
- `GET /api/issues/recent?range=7d&limit=5`

Removed from runtime:

- Auth endpoints
- Invite/settings/log write endpoints
- Automation ingest endpoints

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

## Content workflow

1. Edit `content/*.json`.
2. Run validation:

```bash
npm run content:validate
```

3. Run tests/build:

```bash
npm test
npm run build
```

If any content entry violates schema/business rules, `content:validate` (and therefore `build`) fails.

## Notes

- Data is intentionally public-readable.
- Snippets in issue insights are public in this read-only model.
- Clinical events include structured measurements with comparator/confidence metadata for charting.
- Top navigation uses in-page anchors (`#status`, `#issues`, `#events`, `#timeline`) for quick jumps.
- Dashboard is informational only and not medical advice.
