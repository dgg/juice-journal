## 1. Dockerfile

- [x] 1.1 Rewrite as multi-stage: `FROM oven/bun:${BUN_IMAGE_TAG} AS base` + `WORKDIR /usr/src/app`; `install` stage (`COPY package.json bun.lock /temp/prod/`, `bun install --frozen-lockfile --production`); `release` stage (`COPY --from=install /temp/prod/node_modules node_modules`, `COPY package.json tsconfig.json .`, `COPY src ./src`, `COPY public ./public`)
- [x] 1.2 Add `ARG BUN_IMAGE_TAG=1.4.2-distroless` before first `FROM`
- [x] 1.3 Add `ENV NODE_ENV=production`, `USER nonroot` (distroless has `nonroot` user, not `bun`), `EXPOSE 3000/tcp`, `ENTRYPOINT ["bun","run","src/backend/index.ts"]`
- [x] 1.4 Confirm `COPY db ./db` is absent (already removed manually)

## 2. .dockerignore

- [x] 2.1 Create `.dockerignore`: deny-all `*`, allow `!src/`, `!public/`, `!package.json`, `!bun.lock`, `!tsconfig.json`
- [x] 2.2 Add test exclusions: `src/**/*.test.ts`, `src/**/*.test.tsx`, `src/**/*.spec.ts`, `src/**/*.spec.tsx`, `src/**/__tests__/`, `src/TestDb.ts`, `src/fixture-setup.ts`

## 3. docker-compose.yaml — app service

- [x] 3.1 Add `app` service with `build: { context: ., dockerfile: Dockerfile, args: { BUN_IMAGE_TAG: ${BUN_IMAGE_TAG:-1.4.2-distroless} } }`
- [x] 3.2 Add `depends_on: db (service_healthy) + migrator (service_completed_successfully)`
- [x] 3.3 Add `environment: DATABASE_URL`, `NODE_ENV: production`; `ports: ["3000:3000"]`; `restart: unless-stopped`
- [x] 3.4 Add `healthcheck`: `test: ["CMD","bun","-e","const r=await fetch('http://localhost:3000/api/health');process.exit(r.ok?0:1)"]`, interval 10s, timeout 5s, retries 5, start_period 10s

## 4. .env

- [x] 4.1 Add `BUN_IMAGE_TAG=1.4.2-distroless`

## 5. AGENTS.md

- [x] 5.1 Drop hardcoded Bun version from stack line
- [x] 5.2 Document `.env` `BUN_IMAGE_TAG` drives base image; Dockerfile consumes as build arg

## 6. Verification

- [x] 6.1 `docker build .` succeeds with distroless base
- [ ] 6.2 `docker compose up` starts `app` after `db` healthy + `migrator` completed
- [ ] 6.3 `GET http://localhost:3000/api/health` returns 200
- [ ] 6.4 `GET http://localhost:3000/static/app.css` returns 200 (not 404)
- [ ] 6.5 `GET http://localhost:3000/static/scripts/stats.mjs` returns 200 (not 404)
- [x] 6.6 No test files in image: `ls -R /usr/src/app/src` shows no `*.test.ts` or `TestDb.ts`
- [x] 6.7 `bun check` and `bun test` pass on Bun 1.4.2 (version bump verification)