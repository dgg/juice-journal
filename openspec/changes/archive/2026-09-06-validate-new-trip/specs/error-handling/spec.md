## ADDED Requirements

### Requirement: Unhandled presentation errors render an HTML error page

Any thrown error that reaches `app.onError` from a presentation (non-API) route — an unhandled exception in a handler or middleware that is not a validation failure (validation failures are returned as `422` HTML by the validation middlewares before reaching `onError`) — SHALL produce an HTTP `500` `text/html` response rendering a Pico-styled error page. The page SHALL display a generic user-facing message and SHALL NOT expose the raw error message or stack trace to the user. The error SHALL be logged through the structured logger at `error` level with the request context. API routes (`/api/*`) SHALL continue to use their own `onError(problemDetailsHandler(...))` and SHALL NOT be affected by this handler.

#### Scenario: Database failure during trip creation renders HTML error page

- **GIVEN** the trip creation handler throws an unhandled error (e.g. database connection lost)
- **WHEN** the error reaches `app.onError`
- **THEN** the response SHALL be `500` with `text/html` rendering a Pico-styled error page with a generic message, and the error SHALL be logged via the structured logger; the raw error message SHALL NOT appear in the response body

#### Scenario: API errors unaffected by HTML error handler

- **GIVEN** an API route under `/api/*` throws an error
- **WHEN** the error is handled
- **THEN** it SHALL be handled by the API sub-app's `onError(problemDetailsHandler(...))` and respond with `application/problem+json`, not the HTML error page

#### Scenario: Validation failures do not reach the global error handler

- **GIVEN** a trip form submission fails schema or consistency validation
- **WHEN** the validation middleware renders the form with errors as `422` HTML
- **THEN** the error SHALL NOT reach `app.onError` (it is returned, not thrown)
