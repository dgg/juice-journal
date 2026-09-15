## Purpose

Authenticates users and machine clients via OAuth2 (Google in production, MockServer in local development) and authorizes them against identity allowlists held in environment variables, protecting both the web UI (session cookie) and the API (bearer tokens) without storing any user or session data in the database.

## ADDED Requirements

### Requirement: Web login via OAuth2 authorization code flow

The system SHALL provide an OAuth2 authorization-code-with-PKCE login flow for the web UI. The system SHALL expose `GET /auth/login` (renders a login page with a "Sign in" link), `GET /auth/google/start` (generates a CSRF `state` value, stores it in a short-lived signed cookie, and redirects to the authorization endpoint at `OAUTH_ISSUER_BASE_URL` with `scope=openid email profile` and `access_type=offline`), `GET /auth/google/callback` (validates `state`, exchanges the authorization `code` for tokens at the token endpoint, decodes the returned `id_token` to obtain `sub` and `email`, checks the allowlist, and mints a session cookie), and `GET /auth/logout` (clears the session cookie and redirects to `/auth/login`). The `OAUTH_ISSUER_BASE_URL` environment variable SHALL determine whether the flow targets Google (production) or MockServer (local development).

#### Scenario: Unauthenticated user is redirected to login

- **GIVEN** a user with no `jj_session` cookie
- **WHEN** the user requests any web page (e.g. `/`, `/trips`, `/stats`)
- **THEN** the system SHALL respond with `302` redirecting to `/auth/login`

#### Scenario: Successful login

- **GIVEN** a user clicks "Sign in" and approves the OAuth consent
- **WHEN** the identity provider redirects to `/auth/google/callback` with a valid `code` and matching `state`
- **THEN** the system SHALL exchange the code for tokens, decode the `id_token`, verify the `email` is in the allowlist, set an HMAC-signed `jj_session` cookie (`httpOnly`, `SameSite=Lax`, `Secure` in production, max-age 7 days), and redirect to `/`

#### Scenario: User not on allowlist is rejected

- **GIVEN** a user completes OAuth but their email is not in the allowlist
- **WHEN** the callback handler checks the allowlist
- **THEN** the system SHALL NOT set a session cookie and SHALL respond with `403` with a message indicating the account is not authorized

#### Scenario: CSRF state mismatch

- **GIVEN** a callback request arrives with a `state` parameter that does not match the signed state cookie
- **WHEN** the callback handler validates `state`
- **THEN** the system SHALL respond with `400` and SHALL NOT exchange the authorization code

#### Scenario: Logout clears session

- **GIVEN** a user has a valid `jj_session` cookie
- **WHEN** the user requests `GET /auth/logout`
- **THEN** the system SHALL clear the `jj_session` cookie and redirect to `/auth/login`

#### Scenario: Local development uses MockServer instead of Google

- **GIVEN** `OAUTH_ISSUER_BASE_URL=http://mock-idp:1080` (local dev)
- **WHEN** the user initiates the login flow
- **THEN** the system SHALL redirect to MockServer's authorization endpoint, and the full auth-code flow SHALL complete against MockServer without any call to Google

### Requirement: Stateless signed session cookie

The system SHALL issue a stateless session cookie named `jj_session` containing a base64url-encoded JSON payload (`provider`, `sub`, `email`, `exp`) signed with `HMAC-SHA256` using the `JJ_SECRET` environment variable. The system SHALL verify the signature and expiry on every web request without any database or session-store lookup. The cookie SHALL be `httpOnly`, `SameSite=Lax`, and `Secure` when `NODE_ENV=production`. The cookie max-age SHALL be 7 days.

#### Scenario: Valid cookie grants access

- **GIVEN** a user has a valid, unexpired `jj_session` cookie
- **WHEN** the user requests a protected web page
- **THEN** the system SHALL verify the HMAC signature, set the `principal` in the request context, and serve the page

#### Scenario: Tampered cookie is rejected

- **GIVEN** a user has a `jj_session` cookie whose payload was modified after signing
- **WHEN** the system verifies the HMAC signature
- **THEN** the system SHALL reject the cookie and redirect to `/auth/login`

#### Scenario: Expired cookie is rejected

- **GIVEN** a user has a `jj_session` cookie whose `exp` is in the past
- **WHEN** the system checks the cookie
- **THEN** the system SHALL reject the cookie and redirect to `/auth/login`

### Requirement: API bearer token authentication

The system SHALL require a `Bearer` token in the `Authorization` header for all `/api/*` endpoints except `/api/health`. The system SHALL introspect the token via the OIDC `userinfo` endpoint at `OAUTH_ISSUER_BASE_URL/userinfo` (standard OIDC — works with both Google and MockServer) and cache the result keyed by `SHA-256(token)` with a 5-minute TTL. The system SHALL accept both user access tokens (which carry a `sub` and `email` in the `userinfo` response) and service-account access tokens (which carry an `email` ending in `.iam.gserviceaccount.com` and no `sub` for a human user). The system SHALL set the `principal` in the request context from the introspection result. On missing, invalid, revoked, or expired tokens, the system SHALL respond with `401` `application/problem+json`.

#### Scenario: Valid user bearer token accesses API

- **GIVEN** a `Bearer` token obtained via OAuth that belongs to a user in the allowlist
- **WHEN** a request to `/api/trips` includes the token in the `Authorization` header
- **THEN** the system SHALL introspect the token via `userinfo`, find the `email` in the allowlist, set the `principal`, and serve the request

#### Scenario: Valid service-account bearer token accesses API

- **GIVEN** a `Bearer` token minted by a service account whose email is in `ALLOWED_SERVICE_ACCOUNTS`
- **WHEN** a request to `/api/trips` includes the token in the `Authorization` header
- **THEN** the system SHALL introspect the token, find the service-account email in `ALLOWED_SERVICE_ACCOUNTS`, set the `principal`, and serve the request

#### Scenario: Missing Authorization header

- **GIVEN** no `Authorization` header is present
- **WHEN** a request to `/api/trips` is received
- **THEN** the system SHALL respond with `401` `application/problem+json` with `title: "Unauthorized"` and `detail: "missing bearer token"`

#### Scenario: Invalid or revoked token

- **GIVEN** a `Bearer` token that the `userinfo` endpoint rejects (expired, revoked, or malformed)
- **WHEN** a request to `/api/trips` includes the token
- **THEN** the system SHALL respond with `401` `application/problem+json` with `detail: "token rejected"`

#### Scenario: Token introspection is cached

- **GIVEN** a valid token was introspected within the last 5 minutes
- **WHEN** a second request with the same token arrives
- **THEN** the system SHALL use the cached introspection result and SHALL NOT call the `userinfo` endpoint again

#### Scenario: Health endpoint remains public

- **GIVEN** no authentication credentials
- **WHEN** a request to `/api/health` is received
- **THEN** the system SHALL respond with `200` and the health status without requiring authentication

#### Scenario: Local development introspects against MockServer

- **GIVEN** `OAUTH_ISSUER_BASE_URL=http://mock-idp:1080` (local dev)
- **WHEN** a request to `/api/trips` includes a bearer token issued by MockServer
- **THEN** the system SHALL introspect the token via MockServer's `userinfo` endpoint and the same caching and allowlist logic SHALL apply as in production

### Requirement: Identity allowlist authorization

The system SHALL authorize web users and user-token API callers by checking the `email` from the authenticated identity against the `ALLOWED_GOOGLE_EMAILS` environment variable (comma-separated list). The system SHALL authorize service-account API callers by checking the service-account email against the `ALLOWED_SERVICE_ACCOUNTS` environment variable (comma-separated list). A request that passes authentication but fails authorization SHALL receive `403`.

#### Scenario: Allowed email is permitted

- **GIVEN** `ALLOWED_GOOGLE_EMAILS=dgon@gmail.com`
- **WHEN** an authenticated request arrives with `email=dgon@gmail.com`
- **THEN** the system SHALL authorize the request and proceed

#### Scenario: Disallowed email is forbidden

- **GIVEN** `ALLOWED_GOOGLE_EMAILS=dgon@gmail.com`
- **WHEN** an authenticated request arrives with `email=other@gmail.com`
- **THEN** the system SHALL respond with `403` and SHALL NOT serve the request

#### Scenario: Service account not on machine allowlist

- **GIVEN** `ALLOWED_SERVICE_ACCOUNTS=importer@proj.iam.gserviceaccount.com`
- **WHEN** an authenticated API request arrives from `other@proj.iam.gserviceaccount.com`
- **THEN** the system SHALL respond with `403`

### Requirement: Principal in request context

The system SHALL populate a `principal` object in the Hono request context (`c.var.principal`) for every authenticated request, regardless of whether authentication was via session cookie (web) or bearer token (API). The `principal` SHALL contain `provider` ("google"), `sub` or `email` (the stable identity), `authMethod` ("session-cookie" or "bearer"), and `identityType` ("user" or "service-account"). Route handlers SHALL read `principal` uniformly without branching on the authentication mechanism.

#### Scenario: Web request sets principal from cookie

- **GIVEN** a user with a valid `jj_session` cookie
- **WHEN** the web auth middleware processes the request
- **THEN** `c.var.principal` SHALL be set with `authMethod: "session-cookie"` and `identityType: "user"`

#### Scenario: API request sets principal from bearer token

- **GIVEN** a valid bearer token in the `Authorization` header
- **WHEN** the API auth middleware processes the request
- **THEN** `c.var.principal` SHALL be set with `authMethod: "bearer"` and `identityType` reflecting whether the token is a user or service-account token

### Requirement: Service-account JWT bearer token minting utility

The system SHALL provide a reusable utility (`src/auth/sa-token.ts`) that mints a Google OAuth2 access token from a service-account JSON key file using the `urn:ietf:params:oauth:grant-type:jwt-bearer` grant. The utility SHALL sign a JWT with the service account's RSA private key using Bun's built-in `crypto` module, POST it to Google's token endpoint, and return the access token. The utility SHALL be importable by both the server and in-repo Bun scripts. The service-account key file path SHALL be read from the `GOOG_SA_KEY_PATH` environment variable.

#### Scenario: Minting a service-account token

- **GIVEN** a valid service-account JSON key file at the path in `GOOG_SA_KEY_PATH`
- **WHEN** the minting utility is called
- **THEN** the utility SHALL sign a JWT with the private key, POST it to `https://oauth2.googleapis.com/token` with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`, and return the `access_token`

#### Scenario: Missing key file path

- **GIVEN** `GOOG_SA_KEY_PATH` is not set
- **WHEN** the minting utility is called
- **THEN** the utility SHALL throw an error indicating the key file path is missing

### Requirement: Login page UI

The system SHALL render a login page at `GET /auth/login` using Pico CSS and semantic HTML with no client-side JavaScript. The page SHALL display a "Sign in" link pointing to `/auth/google/start`. The page SHALL follow the project's styling rules (Pico CSS, no inline `<style>` blocks, custom CSS only in `public/app.css`).

#### Scenario: Login page renders

- **GIVEN** no authentication
- **WHEN** a user navigates to `/auth/login`
- **THEN** the system SHALL render an HTML page with a "Sign in" link styled with Pico CSS classes

### Requirement: Local development and integration testing via MockServer

The system SHALL support local development and integration testing without any dependency on Google. The system SHALL use MockServer (configured as a mock OIDC provider with opaque access tokens) as a compose dev service. MockServer SHALL be configured via a single `PUT /mockserver/oidc` call with opaque access tokens (matching Google's opaque-token shape), a `userinfo` endpoint returning configured claims, and an `introspect` endpoint. The system SHALL replace the existing WireMock service in compose with MockServer, which SHALL also serve the weather API mock expectations. The `OAUTH_ISSUER_BASE_URL` environment variable SHALL point at MockServer in development and at Google in production, so the same auth code paths execute against both.

#### Scenario: MockServer configured as OIDC provider in compose

- **GIVEN** the docker-compose dev environment is started
- **WHEN** the MockServer service initializes
- **THEN** MockServer SHALL be configured as an OIDC provider via `PUT /mockserver/oidc` with opaque access tokens, `userinfo` endpoint, and claims matching the dev allowlist identities

#### Scenario: Integration test authenticates without Google

- **GIVEN** MockServer is running and configured as the OIDC provider
- **WHEN** an integration test issues a token via MockServer's token endpoint and sends it as a `Bearer` token to `/api/trips`
- **THEN** the system SHALL introspect the opaque token via MockServer's `userinfo` endpoint, validate against the allowlist, and serve the request — exercising the same introspection code path as production

#### Scenario: Web login flow completes against MockServer

- **GIVEN** `OAUTH_ISSUER_BASE_URL` points at MockServer
- **WHEN** a user initiates the web login flow
- **THEN** the system SHALL redirect to MockServer's authorization endpoint, MockServer SHALL auto-issue an authorization code, and the callback SHALL mint a session cookie — completing the full auth-code flow without any Google dependency

#### Scenario: Weather mock served by MockServer

- **GIVEN** MockServer replaces WireMock in compose
- **WHEN** the weather fetcher requests forecast and archive data
- **THEN** MockServer SHALL serve the weather mock expectations previously served by WireMock