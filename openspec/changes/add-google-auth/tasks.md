## 1. Environment and Google Cloud setup

- [ ] 1.1 Create Google Cloud project (or select existing) and configure OAuth consent screen (External, Testing status, add self as test user, scopes: `openid email profile`) — **MANUAL: requires Google Cloud Console access**
- [ ] 1.2 Create OAuth client ID (Web application) with dev + prod redirect URIs; record `GOOGLE_WEB_CLIENT_ID` and `GOOGLE_WEB_CLIENT_SECRET` — **MANUAL: requires Google Cloud Console**
- [ ] 1.3 Create service account `juice-journal-importer@<proj>.iam.gserviceaccount.com`; download JSON key; record `GOOG_SA_KEY_PATH` — **MANUAL: requires Google Cloud Console**
- [x] 1.4 Add new env vars to `.env` (dev): `OAUTH_ISSUER_BASE_URL=http://mock-idp:1080`, `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET`, `GOOGLE_WEB_REDIRECT_URI`, `ALLOWED_GOOGLE_EMAILS`, `ALLOWED_SERVICE_ACCOUNTS`, `JJ_SECRET`, `GOOG_SA_KEY_PATH`
- [x] 1.5 Add `secrets/*.json` and `.env` entries to `.gitignore` (SA key file must not be committed)

## 2. MockServer compose service and initialization

- [x] 2.1 Add MockServer service to `docker-compose.yaml` (image `mockserver/mockserver:latest`, port `1080:1080`), replacing the existing WireMock `weather` service
- [x] 2.2 Migrate weather mock expectations from WireMock format to MockServer expectations (forecast and archive JSON responses)
- [x] 2.3 Create `dev/setup-mock-idp.ts` script: sends `PUT /mockserver/oidc` to configure MockServer as OIDC provider with `opaqueAccessToken: true`, `additionalClaims` for dev user + service-account identities, and standard scopes (`openid email profile`)
- [x] 2.4 Create `dev/setup-mock-weather.ts` script (or extend 2.3): sends MockServer expectation requests for weather forecast and archive endpoints
- [x] 2.5 Add init mechanism so MockServer is configured on `docker-compose up` (init container, or document running `bun dev/setup-mock-idp.ts` after compose starts)
- [ ] 2.6 Verify weather fetcher works against MockServer expectations (manual smoke test) — **MANUAL: requires running compose**

## 3. Auth module foundation

- [x] 3.1 Create `src/auth/` directory structure
- [x] 3.2 Extend Hono `Env` type (`src/backend/utils/logger.ts`) with `principal` variable: `{ provider: string, sub?: string, email: string, authMethod: "session-cookie" | "bearer", identityType: "user" | "service-account" }`
- [x] 3.3 Implement `src/auth/cookie.ts`: HMAC-SHA256 sign/verify for `jj_session` cookie (base64url payload + signature, `JJ_SECRET` from env, 7-day expiry)
- [x] 3.4 Implement `src/auth/token-cache.ts`: in-memory `Map` keyed by `SHA-256(token)` with TTL (default 5 min), with get/set/evict
- [x] 3.5 Implement `src/auth/introspect.ts`: call OIDC `userinfo` endpoint at `${OAUTH_ISSUER_BASE_URL}/userinfo` with `Authorization: Bearer <token>`, parse response, return `{ email, sub?, isServiceAccount }`; use `token-cache` for caching
- [x] 3.6 Implement `src/auth/allowlist.ts`: parse `ALLOWED_GOOGLE_EMAILS` and `ALLOWED_SERVICE_ACCOUNTS` from env, check functions for user and service-account identities

## 4. Web auth middleware and routes

- [x] 4.1 Implement `src/auth/web-auth.ts` middleware: read `jj_session` cookie, verify HMAC signature and expiry, check allowlist, set `c.var.principal` or redirect to `/auth/login`
- [x] 4.2 Implement `src/auth/oauth-callback.ts`: exchange auth code for tokens at `${OAUTH_ISSUER_BASE_URL}/token`, decode `id_token` JWT (base64 decode payload, no signature verification needed — token came direct from IdP over TLS), extract `sub` and `email`
- [x] 4.3 Implement `/auth/login` route: render login page component with "Sign in" link
- [x] 4.4 Implement `/auth/google/start` route: generate `state`, set short-lived signed state cookie, redirect to `${OAUTH_ISSUER_BASE_URL}/authorize` (`scope=openid email profile`, `access_type=offline`)
- [x] 4.5 Implement `/auth/google/callback` route: validate `state` against cookie, exchange code, decode `id_token`, check allowlist, mint `jj_session` cookie, redirect to `/` (or `403` if not allowlisted)
- [x] 4.6 Implement `/auth/logout` route: clear `jj_session` cookie, redirect to `/auth/login`
- [x] 4.7 Create login page view component (`src/frontend/pages/LoginPage.tsx`): Pico CSS, semantic HTML, no client JS, "Sign in" link

## 5. API auth middleware

- [x] 5.1 Implement `src/auth/api-auth.ts` middleware: extract `Bearer` token from `Authorization` header, introspect via `introspect.ts` (cached), branch on service-account vs user, check appropriate allowlist, set `c.var.principal` or return `401` problem+json
- [x] 5.2 Ensure `/api/health` remains public (not behind `apiAuth`)
- [x] 5.3 Apply `apiAuth` middleware inside `apiTrips` Hono instance (skip for `/health` route)

## 6. Route integration

- [x] 6.1 Mount `/auth/*` routes in `src/backend/index.ts` (before domain routes, not behind any auth middleware)
- [x] 6.2 Apply `webAuth` middleware inside `homeDomain`, `tripsDomain`, `statsDomain` Hono instances
- [x] 6.3 Verify static file handler (`/static/*`) remains public (no auth middleware)

## 7. Service-account token utility

- [x] 7.1 Implement `src/auth/sa-token.ts`: read SA JSON key from `GOOG_SA_KEY_PATH`, sign JWT with `crypto.createSign("RSA-SHA256")`, POST to `${OAUTH_ISSUER_BASE_URL}/token` with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`, return `access_token`
- [x] 7.2 Handle missing `GOOG_SA_KEY_PATH` (throw clear error) and IdP API errors

## 8. Tests

- [x] 8.1 Test `src/auth/cookie.ts`: sign/verify round-trip, tampered payload rejected, expired cookie rejected
- [x] 8.2 Test `src/auth/token-cache.ts`: set/get/evict, TTL expiry, cache hit returns without network call
- [x] 8.3 Test `src/auth/allowlist.ts`: allowed email permitted, disallowed email rejected, service-account check
- [x] 8.4 Test `src/auth/introspect.ts`: calls `${OAUTH_ISSUER_BASE_URL}/userinfo` with Bearer token, parses response, caches result (mock the fetch)
- [x] 8.5 Test `src/auth/api-auth.ts` middleware: missing header → 401, valid user token → principal set, valid SA token → principal set, invalid token → 401, `/api/health` → 200 without auth
- [x] 8.6 Test `src/auth/web-auth.ts` middleware: no cookie → 302 redirect, valid cookie → principal set, tampered cookie → 302 redirect, expired cookie → 302 redirect
- [x] 8.7 Test `src/auth/sa-token.ts`: mint token from a test SA key (mock or test fixture), verify JWT structure and token endpoint call
- [x] 8.8 Integration test (against MockServer): start MockServer, configure as OIDC provider via `dev/setup-mock-idp.ts`, issue opaque token via MockServer's `/token` endpoint, call `/api/trips` with Bearer token → 200, verify introspection cache is used
- [x] 8.9 Integration test (against MockServer): complete full web auth-code flow against MockServer — `/auth/login` → `/auth/google/start` → MockServer `/authorize` → `/auth/google/callback` → session cookie set → protected page renders

## 9. Validation and documentation

- [x] 9.1 Run `bun test` — all existing tests still pass, new tests pass
- [x] 9.2 Run `bun check` — TypeScript compiles without errors
- [x] 9.3 Run `docker build .` — Docker image builds successfully
- [ ] 9.4 Verify `docker-compose up` works with MockServer (manual smoke test: run `bun dev/setup-mock-idp.ts`, login via browser against MockServer, call API with MockServer-issued token) — **MANUAL: requires running compose + browser**
- [x] 9.5 Update `AGENTS.md` or README if auth env vars need documenting (optional, per project conventions)