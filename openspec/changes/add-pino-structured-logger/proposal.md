## Why

The backend currently emits observability output through raw `console.log`/`console.error` calls in `src/backend/index.ts` and `src/db/client.ts`. These calls are unstructured, lack request correlation and log levels, and bypass the `hono-problem-details` `mapError` hook's `console.error` fallback. The stack's declared logger is Pino; this change introduces a single structured logging surface aligned with that decision, using the official `@hono/structured-logger` middleware to expose a request-scoped logger.

## What Changes

- Add `pino` and `@hono/structured-logger` dependencies (dependency addition explicitly approved by the requester; `pino` is already part of the declared stack).
- Register `requestId()` and `structuredLogger()` middleware in `src/backend/index.ts` so every request gets a correlated, request-scoped logger on `c.var.logger`.
- Create a shared `src/utils/logger.ts` module owning the root `pino` instance (JSON in production, `pino-pretty`-style readable output in development) and a typed `Env` for `Variables.logger`.
- Replace the three existing `console.*` call sites: the server-startup log, the database `testConnection` success log, and the database connection failure log.
- Route `mapError` error logging through the structured logger instead of `console.error`.
- Remove all direct `console.*` usage from `src/backend` and `src/db` so logs flow through one logger.

## Capabilities

### New Capabilities

- `structured-logging`: Request-scoped structured logging via Pino and `@hono/structured-logger`, covering the root logger, request-scoped child logger correlation, log levels, dev/production output formatting, and the replacement of all `console.*` application logging.

### Modified Capabilities

- `error-handling`: The "Handler options configuration" requirement currently permits logging errors via `console.error` inside the `mapError` callback. This changes so error logging routes through the structured request-scoped logger instead of `console.error`.

## Impact

- **Dependencies:** Adds `pino` (runtime) and `@hono/structured-logger` (runtime); adds `pino-pretty` as a dev dependency for development output. All are within the Hono ecosystem (`@hono/structured-logger` peers on `hono>=4.0.0`).
- **Code:** `src/backend/index.ts` (middleware registration, startup log), `src/db/client.ts` (connection logging), new `src/utils/logger.ts`, and the `mapError` callback wiring.
- **APIs:** No public API or response-shape changes; logging is purely observability.
- **Runtime:** Bun. No Dockerfile change beyond the dependency install; log output format changes from plain text to structured JSON (production) / pretty (development).

### Rollback

Revert the dependency additions (`bun remove pino pino-pretty @hono/structured-logger`) and restore the prior `console.*` call sites from git. Because logging is non-behavioral and touches no persisted data or public contracts, rollback carries no data-migration risk and can be shipped as a single revert commit.
