## Why

The current Dockerfile is broken: it omits `public/` (so all CSS and static JS 404s), doesn't set `NODE_ENV=production` (so pino's logger tries to load the devDependency `pino-pretty`, which isn't installed), copies the unused `db/` migrations, pins `oven/bun:latest` (non-reproducible), runs as root, and has no `.dockerignore` (so `.git`, `node_modules`, `.env` all enter the build context). `docker-compose.yaml` defines `db`, `migrator`, and `weather` but no `app` service — compose neither builds nor runs the application image.

## What Changes

- **Rewrite `Dockerfile` as multi-stage** (`base` → `install` → `release`) per the official Bun Docker guide: `WORKDIR /usr/src/app`, production `node_modules`, `src/`, `public/`, `package.json`; `ENV NODE_ENV=production`; `USER bun`; `ENTRYPOINT ["bun","run","src/backend/index.ts"]`; no test/build stage.
- **Base image driven by `ARG BUN_IMAGE_TAG`** (default `1.4.2-distroless`), passed from `.env` via compose `build.args`. Distroless for smallest CVE surface; healthcheck uses `bun -e` (no shell).
- **Add `.dockerignore`** — deny-all-then-allow: only `src/`, `public/`, `package.json`, `bun.lock` reach the builder; excludes test files, `src/TestDb.ts`, `src/fixture-setup.ts`, `.env`, `.git`, `node_modules`.
- **Add `app` service to `docker-compose.yaml`** — `build:` with `args.BUN_IMAGE_TAG`, `depends_on: db (healthy) + migrator (completed_successfully)`, `DATABASE_URL`, `NODE_ENV=production`, `ports 3000`, `restart: unless-stopped`, `healthcheck` hitting `GET /api/health` via `bun -e`.
- **Reuse existing `GET /api/health`** (`src/backend/api/trips.ts:24`) as the liveness probe — no new route.
- **Add `BUN_IMAGE_TAG` to `.env`.**
- **Update `AGENTS.md`** — drop hardcoded Bun version; document `.env`-driven tag.

## Capabilities

### New Capabilities

- `container-deployment`: A reproducible, multi-stage Bun distroless container image built and run via docker-compose, with a minimal `.dockerignore`, non-root execution, `NODE_ENV=production`, and a liveness healthcheck against `/api/health`.

### Modified Capabilities

_(none — no application code changes; the `/api/health` route already exists.)_

## Impact

- **Code**: `Dockerfile` (rewrite), `.dockerignore` (new), `docker-compose.yaml` (add `app` service), `.env` (add `BUN_IMAGE_TAG`), `AGENTS.md` (drop hardcoded Bun version, document `.env`-driven tag). No application code changes.
- **API**: none. Reuses existing `GET /api/health`.
- **Dependencies**: none added or removed. `pino-pretty` stays devDependency (now correctly excluded at runtime via `--production` + `NODE_ENV=production`).
- **DB**: none.
- **Rollback**: revert `Dockerfile` to single-stage `FROM oven/bun:latest`, remove `.dockerignore`, remove `app` service from compose, remove `.env` var, restore hardcoded Bun version in `AGENTS.md`. No data migration.