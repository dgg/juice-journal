## Why

The web UI and API are currently anonymous. Issue #7 requires protecting both surfaces with authentication and email-based authorization. The site is a single-user personal tool, so the auth system must be minimal: no user database, no session store, no hosted identity provider. Google OAuth satisfies both the web (auth-code + cookie) and API (service-account JWT-bearer for scripts) needs with zero user-data storage and nothing to host in production. For local development and integration testing, MockServer provides a drop-in OIDC provider that exercises the same auth code paths as production without touching Google.

## What Changes

- Add Google OAuth2 auth-code flow for the web UI: `/auth/login`, `/auth/google/start`, `/auth/google/callback`, `/auth/logout` routes, issuing a stateless HMAC-signed session cookie (no database sessions).
- Add bearer-token auth middleware for `/api/*` (except `/api/health`): introspects access tokens via the OIDC `userinfo` endpoint (cached by token hash, 5-min TTL), accepts both user tokens and service-account tokens.
- Add email/identity allowlist authorization via environment variables: `ALLOWED_GOOGLE_EMAILS` (web + user-token API), `ALLOWED_SERVICE_ACCOUNTS` (machine-token API).
- Add a `principal` object to the Hono request context (`c.var.principal`) populated by either auth path.
- Add login/logout UI to the web presentation layer (Pico-styled, no client JS).
- Add a shared `src/auth/sa-token.ts` utility for service-account JWT signing (Bun built-in `crypto`), usable by both the server and in-repo Bun scripts.
- Make OAuth endpoints configurable via `OAUTH_ISSUER_BASE_URL` so the same code points at Google in production and MockServer in local dev/testing.
- Add MockServer as a compose dev service: serves as a mock OIDC provider (opaque access tokens, `userinfo` + `introspect` endpoints) and replaces the existing WireMock weather mock.
- Add new environment variables: `OAUTH_ISSUER_BASE_URL`, `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET`, `GOOGLE_WEB_REDIRECT_URI`, `ALLOWED_GOOGLE_EMAILS`, `ALLOWED_SERVICE_ACCOUNTS`, `JJ_SECRET`, `GOOG_SA_KEY_PATH`.
- **BREAKING**: All `/api/*` endpoints except `/api/health` now require a valid bearer token. Anonymous API access is removed.

## Capabilities

### New Capabilities
- `authentication`: Google OAuth2 authentication and identity-based authorization for both the web UI (session cookie) and API (bearer token), covering web auth-code flow, API token introspection, service-account machine tokens, env-var allowlist authorization, and local development via a mock OIDC provider.

### Modified Capabilities
- `trips-api`: API endpoints now require authentication; anonymous access is removed.

## Impact

- **Code**: New `src/auth/` module (middleware, token introspection, service-account JWT, cookie signing). New `/auth/*` routes in `src/backend/index.ts`. `apiTrips` and presentation domains gain auth middleware. New login/logout views.
- **APIs**: `/api/*` returns 401 Problem Details on missing/invalid/revoked tokens. New `/auth/*` routes.
- **Dependencies**: No new npm dependencies — uses Hono built-ins, Bun `crypto`, and `fetch`.
- **Compose**: MockServer service added (replaces WireMock); configured via `PUT /mockserver/oidc` with opaque access tokens matching Google's token shape. Weather mock expectations migrate to MockServer.
- **Environment**: Eight new env vars (listed above). Registration of one Google OAuth web client + one service account in Google Cloud Console. `OAUTH_ISSUER_BASE_URL` points at MockServer in dev, Google in prod.
- **Database**: No schema changes — auth is stateless (signed cookie + token introspection).
- **Rollback**: Remove auth middleware from routes, delete `/auth/*` routes and `src/auth/`, unset new env vars, restore WireMock in compose. The `principal` context var is optional; handlers that don't read it are unaffected. No database migrations to reverse.