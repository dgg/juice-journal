## 1. Dependencies

- [ ] 1.1 Add runtime dependencies: `bun add @hono/structured-logger pino`
- [ ] 1.2 Add dev dependency: `bun add -d pino-pretty`
- [ ] 1.3 Pin exact versions in `package.json` and confirm `bun.lock` updates

## 2. Root logger module

- [ ] 2.1 Create `src/utils/logger.ts` exporting a configured root Pino logger
- [ ] 2.2 Configure output: newline JSON in production (`NODE_ENV === "production"`), `pino-pretty` transport in non-production
- [ ] 2.3 Make log level configurable via `LOG_LEVEL` (default `info` prod / `debug` dev)
- [ ] 2.4 Export a typed `Env` with `Variables.logger: pino.Logger` for Hono app typing

## 3. Middleware registration

- [ ] 3.1 Import `requestId` from `hono/request-id` and `structuredLogger` from `@hono/structured-logger` in `src/backend/index.ts`
- [ ] 3.2 Type the app as `Hono<Env>`
- [ ] 3.3 Register `requestId()` before `structuredLogger()`
- [ ] 3.4 Configure `createLogger: (c) => rootLogger.child({ requestId: c.var.requestId })`

## 4. Replace console usage

- [ ] 4.1 Replace the startup `console.log` in `src/backend/index.ts` with a root-logger `info` event carrying `{ port }`
- [ ] 4.2 Replace the `testConnection` success `console.log` with a root-logger `info` event in `src/db/client.ts`
- [ ] 4.3 Replace the `testConnection` failure `console.error` with a root-logger `error` event including the error object
- [ ] 4.4 Verify zero `console.(log|error|warn|info|debug)` matches remain in `src/backend` and `src/db`

## 5. Error-path logging

- [ ] 5.1 Wire the `hono-problem-details` `mapError` callback to log at `error` level via `c.var.logger` (fallback to root logger out-of-request) with `{ err, method, path }`
- [ ] 5.2 Confirm `console.error` is not invoked anywhere on the error path

## 6. Configuration and docs

- [ ] 6.1 Add `LOG_LEVEL` (optional) usage note to `.env`/README as appropriate
- [ ] 6.2 Ensure no secrets or full request bodies are logged in structured objects

## 7. Verification

- [ ] 7.1 Run `bun test`
- [ ] 7.2 Run `docker build .`
- [ ] 7.3 Manually verify dev pretty output and production JSON output by toggling `NODE_ENV`
- [ ] 7.4 Confirm request logs carry `requestId` and error logs carry `err`, `method`, `path`
