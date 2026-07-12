## MODIFIED Requirements

### Requirement: Handler options configuration

`problemDetailsHandler` SHALL be registered with `autoInstance: true` (populating `instance` from the request path when the thrown problem did not specify one), `includeStack: process.env.NODE_ENV !== "production"`, and `defaultType: "about:blank"`. A `mapError` callback MAY be used to log errors before falling through to default handling; when present, error logging SHALL be emitted through the structured request-scoped logger (`c.var.logger`) at `error` level with `{ err, method, path }` rather than via `console.error`. For errors raised outside a request context, the root Pino logger from `src/utils/logger.ts` SHALL be used as the fallback logging target.

#### Scenario: Instance auto-populated from request path

- **GIVEN** a thrown problem that does not specify an `instance`
- **WHEN** the response is built
- **THEN** the `instance` member SHALL equal the request path (e.g. `/api/trips`)

#### Scenario: Explicit instance overrides auto-fill

- **GIVEN** a thrown problem that specifies an `instance`
- **WHEN** the response is built
- **THEN** the `instance` member SHALL equal the explicitly provided value, not the request path

#### Scenario: Map error logs through the structured logger

- **GIVEN** a `mapError` callback is registered on `problemDetailsHandler`
- **WHEN** an error reaches `app.onError` during request handling
- **THEN** the error SHALL be logged at `error` level through `c.var.logger` with `err`, `method`, and `path` fields, and `console.error` SHALL NOT be invoked
