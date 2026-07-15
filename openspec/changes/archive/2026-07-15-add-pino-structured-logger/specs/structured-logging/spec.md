## ADDED Requirements

### Requirement: Structured logging surface via Pino and @hono/structured-logger

The system SHALL provide a single structured logging surface backed by Pino, exposed to all request handling through the `@hono/structured-logger` middleware. A root Pino logger SHALL be owned by `src/utils/logger.ts`, and the Hono app SHALL be typed with `Variables.logger: pino.Logger` so the request-scoped logger on `c.var.logger` is type-safe. The dependencies `pino` (runtime) and `@hono/structured-logger` (runtime) SHALL be installed; `pino-pretty` SHALL be installed as a dev dependency for development output only.

#### Scenario: Request-scoped logger is available on context

- **GIVEN** the `requestId()` and `structuredLogger()` middleware are registered in `src/backend/index.ts`
- **WHEN** a request is handled by any route
- **THEN** `c.var.logger` SHALL be a Pino logger instance and SHALL be usable to emit `info`, `warn`, `error`, and `debug` calls without importing a logger manually

#### Scenario: Single root logger module

- **GIVEN** the codebase after the change
- **WHEN** searching `src/` for Pino instance creation (`pino(`) outside `src/utils/logger.ts`
- **THEN** zero root-logger constructions SHALL exist outside `src/utils/logger.ts`

### Requirement: Request correlation via request id

Every log line emitted during request handling SHALL carry the request id. The `requestId()` middleware SHALL be registered before `structuredLogger()`, and the `createLogger` callback SHALL produce `rootLogger.child({ requestId: c.var.requestId })` so the correlation id is attached automatically to every log produced through `c.var.logger`.

#### Scenario: Correlation id attached to request logs

- **GIVEN** an incoming request with a generated request id
- **WHEN** a handler logs via `c.var.logger.info(...)`
- **THEN** the emitted log record SHALL contain a `requestId` field matching the request id produced by `hono/request-id`

### Requirement: Environment-aware output format and level

The root logger SHALL emit newline-delimited JSON to stdout when `NODE_ENV === "production"` and SHALL use the `pino-pretty` transport for human-readable output in non-production. The log level SHALL be configurable via a `LOG_LEVEL` environment variable, defaulting to `info` in production and `debug` in development.

#### Scenario: Production emits JSON at info level

- **GIVEN** `NODE_ENV === "production"` and no `LOG_LEVEL` is set
- **WHEN** the logger emits a record
- **THEN** the output SHALL be a single JSON object per line on stdout and the effective level SHALL be `info`

#### Scenario: Development uses pretty transport at debug level

- **GIVEN** `NODE_ENV` is not `"production"` and no `LOG_LEVEL` is set
- **WHEN** the logger emits a record
- **THEN** the output SHALL be rendered through the `pino-pretty` transport and the effective level SHALL be `debug`

### Requirement: No direct console logging in application code

After the change, application code in `src/backend` and `src/db` SHALL NOT use `console.log`, `console.error`, `console.warn`, `console.info`, or `console.debug`. All application logging SHALL flow through the root logger or the request-scoped `c.var.logger`.

#### Scenario: console usage removed

- **GIVEN** the codebase after migration
- **WHEN** searching `src/backend` and `src/db` for `console.(log|error|warn|info|debug)`
- **THEN** zero matches SHALL exist

### Requirement: Startup and database connection logging

Server startup and database connection events SHALL be logged through the root Pino logger. At boot, the system SHALL emit an `info` event recording the listening port. The `testConnection` function SHALL log success at `info` and failure at `error`, including the error object on failure, instead of using `console.*`.

#### Scenario: Startup logs listening port

- **GIVEN** the server is started with `PORT` set (or defaulting to 3000)
- **WHEN** the Hono app begins listening
- **THEN** an `info` log record SHALL be emitted containing the resolved port value

#### Scenario: Database connection success is logged

- **GIVEN** `testConnection()` runs and the `SELECT 1` query succeeds
- **WHEN** the connection check completes
- **THEN** an `info` log record SHALL be emitted indicating success, and no `console.log` SHALL be invoked

#### Scenario: Database connection failure is logged at error level

- **GIVEN** `testConnection()` runs and the `SELECT 1` query throws
- **WHEN** the connection check fails
- **THEN** an `error` log record SHALL be emitted containing the error object, and no `console.error` SHALL be invoked
