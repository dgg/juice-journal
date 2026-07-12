## ADDED Requirements

### Requirement: Unified Problem Details error contract

The system SHALL emit every API error response as an RFC 9457 Problem Details object with `Content-Type: application/problem+json` and a JSON body containing the standard members `type`, `status`, `title`, `detail`, and (when applicable) `instance`, plus optional extension members flattened to the top level. A single `app.onError(problemDetailsHandler(...))` registered in `src/backend/index.ts` SHALL own the construction of this response for all thrown `ProblemDetailsError`, `HTTPException`, validation failures, and unhandled exceptions. No route handler or middleware SHALL construct an error response body directly via `c.json({ error, ... }, status)` after this change.

#### Scenario: Handler throws a problem details error

- **GIVEN** a route handler throws a `ProblemDetailsError` produced by `problemDetails()` or the problem type registry
- **WHEN** the error reaches `app.onError`
- **THEN** the response SHALL have `Content-Type: application/problem+json`, the HTTP status from the thrown problem, and a body containing `type`, `status`, `title`, and `detail` matching the thrown values

#### Scenario: HTTPException is mapped to problem details

- **GIVEN** a route handler throws an `HTTPException`
- **WHEN** the error reaches `app.onError`
- **THEN** the response SHALL be `application/problem+json` with the exception's status, the standard HTTP reason phrase as `title` (when the problem did not specify one), and a `detail` derived from the exception message

#### Scenario: No handler shapes its own error body

- **GIVEN** the codebase after migration
- **WHEN** searching `src/backend/handlers.ts` and `src/backend/validators.ts` for `c.json(` calls whose body contains an `error` field or a `path`/`message` error envelope
- **THEN** zero matches SHALL exist in error-handling paths (success-path `c.json` calls are unaffected)

### Requirement: Unhandled errors produce a safe 500

Any thrown error that is not a `ProblemDetailsError`, an `HTTPException`, or matched by `mapError` SHALL produce an HTTP `500` problem+json response whose `detail` is the constant string `"An unexpected error occurred"`. The raw `error.message` and stack trace SHALL NOT appear in `detail`. Stack traces MAY be surfaced as a top-level `stack` extension member only when `includeStack` is enabled, which SHALL be disabled in production (`NODE_ENV === "production"`).

#### Scenario: Unhandled exception yields generic 500

- **GIVEN** a route handler throws a plain `Error("DB connection lost: ECONNREFUSED")`
- **WHEN** the error reaches `app.onError`
- **THEN** the response SHALL be `500` `application/problem+json` with `detail` equal to `"An unexpected error occurred"` and SHALL NOT contain the string `ECONNREFUSED` in the body when `includeStack` is disabled

#### Scenario: Stack surfaced only outside production

- **GIVEN** `NODE_ENV` is not `"production"` and `includeStack` is enabled
- **WHEN** an unhandled exception reaches `app.onError`
- **THEN** the response body SHALL include a top-level `stack` extension member and `detail` SHALL remain `"An unexpected error occurred"`

#### Scenario: Production omits stack

- **GIVEN** `NODE_ENV === "production"`
- **WHEN** any error reaches `app.onError`
- **THEN** the response body SHALL NOT include a `stack` member

### Requirement: Problem type registry for domain errors

The system SHALL define a problem type registry (`createProblemTypeRegistry`) in `src/backend/problems.ts` as the single source of truth for the `type` URI, `status`, and `title` of domain errors thrown from more than one site. The registry SHALL include at least `TRIP_CONFLICT` (status `409`) and `FOREIGN_KEY_VIOLATION` (status `422`). Domain errors thrown from handlers and validators SHALL be created via `problems.create(...)` rather than inline `problemDetails({...})` calls with literal type URIs.

#### Scenario: Trip conflict uses registry type

- **GIVEN** a `POST /api/trips` request violates the `UNIQUE(vehicle_id, end_time)` constraint
- **WHEN** the conflict is detected
- **THEN** the response `type` SHALL be the registry-defined URI for `TRIP_CONFLICT` and `status` SHALL be `409`

#### Scenario: Foreign-key violation uses registry type

- **GIVEN** a `POST /api/trips` request references a non-existent `vehicle_id` or location
- **WHEN** the FK validator rejects it
- **THEN** the response `type` SHALL be the registry-defined URI for `FOREIGN_KEY_VIOLATION` and `status` SHALL be `422`

### Requirement: Handler options configuration

`problemDetailsHandler` SHALL be registered with `autoInstance: true` (populating `instance` from the request path when the thrown problem did not specify one), `includeStack: process.env.NODE_ENV !== "production"`, and `defaultType: "about:blank"`. A `mapError` callback MAY be used to log errors via `console.error` before falling through to default handling.

#### Scenario: Instance auto-populated from request path

- **GIVEN** a thrown problem that does not specify an `instance`
- **WHEN** the response is built
- **THEN** the `instance` member SHALL equal the request path (e.g. `/api/trips`)

#### Scenario: Explicit instance overrides auto-fill

- **GIVEN** a thrown problem that specifies an `instance`
- **WHEN** the response is built
- **THEN** the `instance` member SHALL equal the explicitly provided value, not the request path
