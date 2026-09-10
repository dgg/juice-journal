## Context

The app is a Bun + Hono SSR application that runs TypeScript directly (no compile step). `src/backend/index.ts` serves `/static/*` from `./public/` (relative to CWD = `/usr/src/app` in the container) and requires `DATABASE_URL` at boot (`src/backend/db/client.ts`). The logger (`src/backend/utils/logger.ts`) branches on `NODE_ENV === "production"`: in production it writes to stdout via `pino.destination(1)`; otherwise it spawns a `pino-pretty` worker — a devDependency excluded by `bun install --production`. `GET /api/health` already exists at `src/backend/api/trips.ts:24` returning `{ status: "ok" }`. The existing `docker-compose.yaml` runs `db` (postgres), `migrator` (dbmate, mounts `./db`), and `weather` (wiremock) but has no `app` service.

## Goals / Non-Goals

**Goals:**
- Ship a reproducible, minimal container image that runs the app correctly.
- Drive the build and run from `docker-compose.yaml`.
- Pin the base image via `.env` for per-environment control.
- Exclude test code and secrets from the build context and image.

**Non-Goals:**
- No CI pipeline or registry push (image tagging handled externally / by CI later).
- No Kubernetes or Swarm manifests — single-host Docker via compose.
- No change to the `weather` wiremock service (out of scope).
- No `OPEN_METEO_HOST` env or app-code changes — the app always calls the real Open-Meteo API.
- No build/compile step — Bun runs TypeScript directly.

## Decisions

### D1: Multi-stage — `base` → `install` → `release`
Follow the official Bun Docker guide. `install` stage installs production deps into `/temp/prod`; `release` copies `node_modules` from `install` then `src/`, `public/`, `package.json`. No `prerelease` stage (no tests or build to run). Final image contains only runtime files — no bun install cache, no test files.
- **Alternative:** single-stage. Rejected — larger image, install cache in final layer.

### D2: Distroless base via `ARG BUN_IMAGE_TAG`
`FROM oven/bun:${BUN_IMAGE_TAG}` with `ARG BUN_IMAGE_TAG=1.4.2-distroless`. Compose passes `BUN_IMAGE_TAG` from `.env` as a `build.arg`. Distroless = no shell, no package manager, smallest CVE surface. Healthcheck uses `bun -e` (no shell needed). Flipping to alpine for debugging is a one-line `.env` change.
- **Alternative:** alpine. Rejected for prod — larger attack surface (shell + busybox). Available via `.env` for debugging.

### D3: `public/` inside `/usr/src/app/` (no app-code change)
`WORKDIR /usr/src/app`; `COPY public ./public` → `/usr/src/app/public`. `index.ts:40` reads `./public/${path}` which resolves to `/usr/src/app/public` under CWD. No application code changes needed.
- **Alternative:** `public/` as sibling of `app/` at `/usr/src/public`. Rejected — would require changing `index.ts` to `../public/` or adding a `PUBLIC_DIR` env, coupling server code to repo layout.

### D4: `.dockerignore` deny-all-then-allow
Deny-all is safer than deny-list: new files default to excluded. Test files, `TestDb.ts` (imports `testcontainers`), and `fixture-setup.ts` (imports `bun:test`) are excluded from the image. `.env` is excluded by default — secrets can't leak into build context.
- **Alternative:** deny-list (like the Bun docs example). Rejected — `COPY src ./src` ships test files; deny-all is more robust.

### D5: Healthcheck reuses `GET /api/health` via `bun -e`
The route already exists (`trips.ts:24`). Compose carries the healthcheck (not the Dockerfile) — single source for health config. Distroless has no shell/curl, so `CMD` exec form: `["CMD","bun","-e","const r=await fetch('http://localhost:3000/api/health');process.exit(r.ok?0:1)"]`. Pure liveness (no DB check) — DB-down shouldn't kill the container, it should 500 on requests.
- **Alternative:** add a DB-touching readiness check. Rejected — `HEALTHCHECK` is liveness; DB-down should 500, not restart.

### D6: `ENTRYPOINT` over `CMD`
Per Bun docs. Slightly better for single-purpose image; moot under distroless (no shell to override to).

### D7: Compose `app` service ordering
`depends_on: db (service_healthy) + migrator (service_completed_successfully)`. Migrations run to completion before the app starts. `restart: unless-stopped`.

### D8: AGENTS.md — drop hardcoded Bun version
Replace the stack line's pinned Bun version with: "Bun base image tag driven by `.env` (`BUN_IMAGE_TAG`); Dockerfile consumes it as a build arg." One source of truth in `.env`.

## Risks / Trade-offs

- [Distroless has no shell — can't `docker exec -it app sh` for debugging] → Mitigation: flip `BUN_IMAGE_TAG` to `1.4.2-alpine` in `.env` for debug sessions.
- [`oven/bun:1.4.2-distroless` tag must exist and be maintained] → Verified by user; `oven/bun` publishes distroless variants alongside debian/alpine.
- [`pino-pretty` not installed in prod → logger breaks if `NODE_ENV` not `production`] → Fixed by `ENV NODE_ENV=production` in Dockerfile.
- [No `HEALTHCHECK` in Dockerfile] → Acceptable — compose carries the healthcheck; Dockerfile stays portable for non-compose use.
- [Bumping from Bun 1.3.10 (AGENTS.md) to 1.4.2] → Verify `bun check` and `bun test` pass on 1.4.2 before merging.

## Migration Plan

1. Rewrite `Dockerfile` (multi-stage, `ARG BUN_IMAGE_TAG`, `COPY public`, `ENV NODE_ENV=production`, `USER bun`, `ENTRYPOINT`).
2. Create `.dockerignore`.
3. Add `app` service to `docker-compose.yaml` with `build.args`, `depends_on`, `environment`, `healthcheck`.
4. Add `BUN_IMAGE_TAG` to `.env`.
5. Update `AGENTS.md` — drop hardcoded Bun version, document `.env`-driven tag.
6. Verify: `docker build .` succeeds; `docker compose up` starts `app` after `db` healthy + `migrator` complete; `GET /api/health` returns 200; `/static/app.css` served (no 404).
7. Rollback: revert all files. No data migration.

## Open Questions

- Should the `weather` wiremock service be behind a compose `profile: [dev]`? Deferred — out of scope.
- Should a `HEALTHCHECK` also be in the Dockerfile for non-compose use? Deferred — compose is the deployment unit for now.