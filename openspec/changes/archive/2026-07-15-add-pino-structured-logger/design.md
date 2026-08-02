## Context

`juice-journal` runs on Bun + Hono. The stack doc declares Pino as the logger, but no logging library is installed and observability is emitted through three raw `console.*` call sites: the server-startup message (`src/backend/index.ts:37`), the database connection-success message (`src/db/client.ts:15`), and the database connection-failure message (`src/db/client.ts:18`). The `hono-problem-details` `mapError` hook also permits a `console.error` fallback per the `error-handling` spec. There is no request correlation, no log levels, and no consistent output format.

The requester explicitly chose `@hono/structured-logger` (the official Hono middleware in `honojs/middleware`, peer dep `hono>=4.0.0`, zero runtime deps) paired with `pino`. Adding `pino` is within the declared stack; `@hono/structured-logger` and `pino-pretty` (dev) are the requester-approved additions satisfying the dependency-review gate.

## Goals / Non-Goals

**Goals:**

- One structured logging surface for the whole backend, backed by Pino.
- A request-scoped, type-safe logger (`c.var.logger`) correlated via request id.
- Replace every `console.*` application log in `src/backend` and `src/db`.
- Dev-friendly readable output; production-safe JSON with no secrets.
- Route error-path logging through the structured logger instead of `console.error`.

**Non-Goals:**

- Log shipping/transports to external sinks (Datadog, Loki, etc.).
- Frontend (HTMX) logging.
- Changing any public API response shape or the RFC 9457 problem-details contract.
- Audit logging or redaction of arbitrary PII beyond not logging secrets by construction.

## Decisions

### Decision 1: `@hono/structured-logger` + `pino` over `hono-pino`

Use `@hono/structured-logger` with a `pino` root logger, as requested. The middleware exposes a request-scoped logger on `c.var.logger`, supports `onRequest`/`onResponse`/`onError` hooks, and integrates natively with `hono/request-id`.

- **Alternatives considered:**
    - `hono-pino` (`@maou-shonen/hono-pino`): community plugin, also Pino-based, but not the official Hono middleware and not what the requester selected.
    - Hono's built-in `hono/logger`: line-only, not structured, not level-aware — insufficient.
- **Rationale:** official Hono middleware, library-agnostic `BaseLogger` interface, type-safe `Variables.logger`, peers only on `hono`.

### Decision 2: Single root logger module at `src/utils/logger.ts`

Own one root `pino` instance in a shared module and export a typed `Env` (`Variables.logger: pino.Logger`) plus the configured root logger. All child loggers derive from this root so configuration (level, format) lives in one place.

### Decision 3: Dev vs production output format

- Production (`NODE_ENV === "production"`): newline-delimited JSON to stdout, level from `LOG_LEVEL` env defaulting to `info`.
- Development: `pino-pretty` readable output via `transport: { target: "pino-pretty" }`, level defaulting to `debug`.
- **Risk noted:** pino transports use worker threads; Bun supports these, but as a safeguard the dev transport is opt-in only in non-production so a transport issue never affects production JSON output.

### Decision 4: Request correlation via `hono/request-id`

Register `requestId()` before `structuredLogger()`. The `createLogger` callback builds `rootLogger.child({ requestId: c.var.requestId })`, so every log line emitted during a request carries the correlation id without handlers doing anything.

### Decision 5: Startup and DB connection logging

- Server startup: the root logger emits a single `info` "server listening" event with `{ port }` at boot.
- `testConnection()`: success emits `info` with `{ connected: true }`; failure emits `error` with the error object (not a raw `console.error`). `testConnection` receives (or imports) the root logger rather than reaching into Hono context, since it runs outside a request.

### Decision 6: Error-path logging in `mapError`

The `hono-problem-details` `mapError` callback is wired to log via the request-scoped logger when available (falling back to the root logger for out-of-request failures) at `error` level with `{ err, method, path }`, replacing the `console.error` option. This is the requirement change captured in the `error-handling` delta spec.

## Risks / Trade-offs

- **`@hono/structured-logger` is v0.1.0 (young).** → Pin the exact version in `package.json`; wrap usage behind `src/utils/logger.ts` so an API change touches one file.
- **`pino-pretty` is an added dev dependency.** → Dev-only; keeps production dependency surface to `pino` + `@hono/structured-logger`.
- **pino transport behavior on Bun.** → Dev-only transport; production uses the default JSON serializer (no transport).
- **Log secrets accidentally.** → Log structured objects with explicit fields; never log full request bodies or env values. No additional PII redaction engine in scope (Non-Goal).

## Migration Plan

1. `bun add @hono/structured-logger pino` and `bun add -d pino-pretty`.
2. Add `src/utils/logger.ts` exporting the root logger and typed `Env`.
3. Register `requestId()` + `structuredLogger()` and type the app as `Hono<Env>` in `src/backend/index.ts`.
4. Replace the startup `console.log` and DB `console.*` calls.
5. Wire `mapError` to the structured logger.
6. Add `LOG_LEVEL` to `.env` (optional) and document it.
7. Verify `bun test` and `docker build .`.
8. Rollback: single revert commit; `bun remove` the added packages. No data or API impact.

## Open Questions

- None blocking. `LOG_LEVEL` env default (`info` prod / `debug` dev) is assumed unless the requester prefers a single fixed level.
