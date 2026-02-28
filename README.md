# Moomoo CKD Journey Monitor

Public, read-only monitoring website for Momoo's CKD journey using a content-as-code model.

## What this implements

- Single-page public quick view at `/`
- Visual-first desktop dashboard shell with left log thread and right inspector
- Deterministic NLP issue extraction from text notes
- 7-day recent-issues list and stacked issue trend chart
- Soft alert computation from thresholds
- Text-log deep-link selection via `?selected=<thread-id>`
- RAG-ready context events feed
- Strict content validation during build

## Architecture

- Framework: Next.js App Router + TypeScript
- UI: Tailwind CSS + Recharts
- Data source: repository JSON content files (no DB/auth runtime)
- Validation: Zod schemas

### Internal module boundaries

- Data access/use-cases live under `src/lib/data/`:
  - `content-source.ts`: normalized content loader boundary
  - `public-read.ts`: read-only API-oriented selectors
  - `workbench.ts`: `/` lab workbench payload
  - `mainboard.ts`: 10-box mainboard payload derivation
  - `quickview.ts`: legacy quick-view/thread composition
- Compatibility barrel remains at `src/lib/data.ts` (`@/lib/data` import path stays stable).
- Derive surface is split under `src/content/derive/` by domain:
  - `logs.ts`, `issues.ts`, `mainboard.ts`, `workbench-weight.ts`, `workbench-clinical.ts`, `shared.ts`
- Compatibility implementation currently remains in `src/content/derive/internal.ts` and is exported through `src/content/derive/index.ts`.

## Component taxonomy

Active dashboard UI is organized under `src/components/dashboard`:

- `dashboard-shell/`: shell/header/range controls
- `board/`: mainboard orchestration (`MainboardGrid`)
- `boxes/`: one folder per board box (`box-01` through `box-10`)
- `boxes/shared/`: shared primitives for box composition

Legacy, non-active components are isolated under `src/components/legacy`.

## Canonical content files

- `content/medical_logs.json`
- `content/daily-life.json`
- `content/lexicon.json`
- `content/thresholds.json`
- `content/clinical-events.json`

All runtime reads derive from those files.

## App routes

- `/` canonical lab workbench page (`?range=all|7d|30d|90d`, optional `box=`)
- `/lab` redirects to `/` (preserves valid `range`/`box`)
- `/dashboard` redirects to `/` (preserves valid `range`/`box`)
- `/timeline` redirects to `/`
- `/login` redirects to `/?notice=read-only`
- `/app/*` redirects to `/?notice=read-only`

### Workbench boxes on `/`

- `box-01` Weight trend only (single merged line) with healthy reference line at `8 lb`
- `box-02` Higher-is-worse clinical metrics line chart:
  - `bun`, `creatinine`, `sdma`, `phosphorus`, `upc`, `potassium`, `t4`
- `box-03` Lower-is-worse clinical metrics line chart:
  - `albumin`, `hct`, `hemoglobin`, `pcv`, `total-protein`
- Severity model:
  - `creatinine` and `sdma`: IRIS-aligned staged mapping
  - other metrics: relative percentile zone mapping
- Sparse ranges render assumed healthy baseline lines (zone `0`) plus measured clinical points

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
- Dashboard is desktop-first with basic small-screen fallback.
- Dashboard is informational only and not medical advice.
