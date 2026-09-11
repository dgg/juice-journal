## ADDED Requirements

### Requirement: API authentication required

All `/api/*` endpoints except `/api/health` SHALL require a valid Google OAuth2 bearer token in the `Authorization` header. Anonymous access to `/api/trips` and any future API endpoints SHALL be rejected with `401` `application/problem+json`. Authentication and authorization SHALL be performed by the `authentication` capability's API auth middleware. The `/api/health` endpoint SHALL remain publicly accessible without authentication.

#### Scenario: Anonymous API request is rejected

- **GIVEN** no `Authorization` header is present
- **WHEN** a `POST /api/trips` or `GET /api/trips` request is sent
- **THEN** the system SHALL respond with `401` `application/problem+json` before reaching the route handler

#### Scenario: Authenticated API request succeeds

- **GIVEN** a valid bearer token for an authorized identity
- **WHEN** a `POST /api/trips` or `GET /api/trips` request is sent with the token
- **THEN** the system SHALL process the request as before, returning `201` or `200` respectively

#### Scenario: Health endpoint remains public

- **GIVEN** no authentication credentials
- **WHEN** a `GET /api/health` request is sent
- **THEN** the system SHALL respond with `200` and `{ "status": "ok" }` without requiring authentication