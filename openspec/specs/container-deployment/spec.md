## Purpose

The application SHALL be packaged as a reproducible, multi-stage Bun distroless container image built and run via docker-compose, with a minimal build context, non-root execution, production logging configuration, and a liveness healthcheck.

## ADDED Requirements

### Requirement: The container image is built from a multi-stage Dockerfile

The system SHALL build the application image using a multi-stage Dockerfile with `base`, `install`, and `release` stages. The `install` stage SHALL install production dependencies into a temporary directory. The `release` stage SHALL copy only the production `node_modules`, `src/`, `public/`, and `package.json` into the final image. No test files, test support files, or devDependencies SHALL be present in the final image.

#### Scenario: Image contains only runtime files

- **GIVEN** the Dockerfile is built
- **WHEN** the image is inspected
- **THEN** the final image SHALL contain `node_modules/` (production deps only), `src/` (excluding test files), `public/`, and `package.json`, and SHALL NOT contain `src/TestDb.ts`, `src/fixture-setup.ts`, `*.test.ts`, `*.spec.ts`, or any `__tests__/` directory

#### Scenario: Production dependencies only

- **GIVEN** `package.json` lists `pino-pretty` as a devDependency
- **WHEN** the image is built with `bun install --frozen-lockfile --production`
- **THEN** `pino-pretty` SHALL NOT be installed in the final image's `node_modules/`

### Requirement: The base image tag is driven by a build argument

The system SHALL accept `BUN_IMAGE_TAG` as a Dockerfile `ARG` (default `1.4.2-distroless`) and use it in the `FROM` directive. The tag SHALL be passed from `.env` via docker-compose `build.args`.

#### Scenario: Default distroless base

- **GIVEN** `BUN_IMAGE_TAG` is unset in `.env`
- **WHEN** the image is built via `docker compose build`
- **THEN** the base image SHALL be `oven/bun:1.4.2-distroless`

#### Scenario: Alpine override for debugging

- **GIVEN** `BUN_IMAGE_TAG=1.4.2-alpine` in `.env`
- **WHEN** the image is built via `docker compose build`
- **THEN** the base image SHALL be `oven/bun:1.4.2-alpine`

### Requirement: The application runs as non-root

The system SHALL set `USER bun` in the Dockerfile so the application process runs as the `bun` user, not as root.

#### Scenario: Non-root execution

- **WHEN** the container starts
- **THEN** the application process SHALL run as the `bun` user

### Requirement: Production logging is configured

The system SHALL set `ENV NODE_ENV=production` in the Dockerfile so that `src/backend/utils/logger.ts` uses `pino.destination(1)` (stdout) instead of spawning a `pino-pretty` worker thread.

#### Scenario: Logger uses stdout in production

- **GIVEN** `NODE_ENV=production` is set in the Dockerfile
- **WHEN** the application starts
- **THEN** the logger SHALL write to stdout without requiring `pino-pretty`

### Requirement: Static assets are served from the container

The system SHALL copy `public/` into the image at `/usr/src/app/public/` so that `GET /static/*` requests resolve to files on disk.

#### Scenario: CSS and scripts are served

- **GIVEN** `public/app.css` and `public/scripts/stats.mjs` exist
- **WHEN** the container is running and a client requests `/static/app.css`
- **THEN** the response SHALL be 200 with the file contents (not 404)

### Requirement: docker-compose builds and runs the application

The system SHALL define an `app` service in `docker-compose.yaml` that builds the image from the Dockerfile and runs it. The service SHALL depend on `db` being healthy and `migrator` completing successfully before starting.

#### Scenario: App starts after database and migrations

- **GIVEN** `docker compose up` is invoked
- **WHEN** the `db` service is healthy and `migrator` has exited successfully
- **THEN** the `app` service SHALL start and listen on port 3000

#### Scenario: App waits for migrations

- **GIVEN** `migrator` is still running
- **WHEN** the `app` service evaluates `depends_on`
- **THEN** the `app` service SHALL NOT start until `migrator` completes with `service_completed_successfully`

### Requirement: A liveness healthcheck probes /api/health

The system SHALL define a healthcheck in the `app` service that issues `GET http://localhost:3000/api/health` using `bun -e` (exec form, no shell). The healthcheck SHALL be a pure liveness check — it SHALL NOT depend on database connectivity.

#### Scenario: Healthy app passes healthcheck

- **GIVEN** the application is running and responding on port 3000
- **WHEN** the healthcheck runs
- **THEN** it SHALL exit 0

#### Scenario: Unresponsive app fails healthcheck

- **GIVEN** the application is not responding on port 3000
- **WHEN** the healthcheck runs
- **THEN** it SHALL exit non-zero

### Requirement: The build context excludes secrets and non-runtime files

The system SHALL include a `.dockerignore` that denies all files by default and allows only `src/`, `public/`, `package.json`, and `bun.lock`. Test files within `src/` SHALL be excluded. `.env` SHALL be excluded from the build context.

#### Scenario: Secrets do not enter build context

- **GIVEN** `.env` contains database credentials
- **WHEN** the image is built
- **THEN** `.env` SHALL NOT be present in the build context or the final image

### Requirement: AGENTS.md does not hardcode the Bun version

The system SHALL document in `AGENTS.md` that the Bun base image tag is driven by `.env` (`BUN_IMAGE_TAG`), not hardcoded in the Dockerfile or docs.

#### Scenario: Version controlled by .env

- **GIVEN** `AGENTS.md` is read
- **WHEN** a developer needs to change the Bun version
- **THEN** the documentation SHALL direct them to `.env` `BUN_IMAGE_TAG`, not to editing the Dockerfile or AGENTS.md