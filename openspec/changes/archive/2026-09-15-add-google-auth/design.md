## Context

The web UI and API are currently anonymous. See `proposal.md` for motivation. This design covers the technical approach for adding Google OAuth2 authentication to both surfaces using a stateless architecture — no user database, no session store, no hosted identity provider.

The existing app (`src/backend/index.ts`) mounts a single Hono app with `requestId` and `structuredLogger` middleware, then routes to `apiTrips` (API), three presentation domains (web), and a static file handler. There is no auth layer. The Hono `Env` type currently carries only `logger`; it will be extended with `principal`.

## Goals / Non-Goals

**Goals:**
- Protect all web pages and API endpoints (except `/api/health`) with Google OAuth2.
- Support two API token types: user tokens (from device/refresh flow) and service-account tokens (from JWT-bearer flow) — both introspected the same way.
- Store zero user or session data in the database.
- Keep auth middleware provider-agnostic in shape (the `principal` model) so a second provider could be added later without restructuring.
- No new npm dependencies — use Hono built-ins, Bun `crypto`, and `fetch`.

**Non-Goals:**
- Building a CLI (deferred — noted as a future possibility; this change only provides the reusable `sa-token.ts` utility the CLI would import).
- Supporting providers other than Google in this change (the architecture doesn't preclude it, but only Google is implemented).
- User registration, profile management, or role-based access control (single-user tool, allowlist-only).
- Database migrations (auth is stateless).
- Refreshing access tokens server-side (the server only introspects; token lifecycle is the client's responsibility).

## Decisions

### D1: Stateless HMAC-signed session cookie (no session store)

The web session is a signed cookie, not a server-side session. The cookie payload (`{ provider, sub, email, exp }`) is base64url-encoded and signed with `HMAC-SHA256(payload, JJ_SECRET)`. Verification is a signature check + expiry check — no database call, no Redis, no session table.

**Why over alternatives:**
- *Server-side sessions (Redis/DB)*: requires a session store to manage — violates "zero user data storage" and adds infra.
- *JWT as session (signed by Google)*: Google's `id_token` is short-lived (1h) and not designed as a reusable session token. Re-issuing on every expiry means a round-trip to Google on each session refresh. The HMAC cookie gives us control over TTL (7 days) without a Google dependency on every request.

**Cookie attributes:** `httpOnly` (no JS access), `SameSite=Lax` (HTMX same-origin requests carry it), `Secure` in production, `maxAge=7d`. The `path=/` so it covers all routes.

### D2: Token introspection via OIDC `userinfo` endpoint (cached), not local JWT validation

Google access tokens are **opaque** — not JWTs. They cannot be validated locally with a public key. The server MUST call the OIDC `userinfo` endpoint (`GET ${OAUTH_ISSUER_BASE_URL}/userinfo` with `Authorization: Bearer <token>`) to validate them and obtain identity claims. This is standard OIDC and works with both Google (`https://openidconnect.googleapis.com/v1/userinfo`) and MockServer (`http://mock-idp:1080/userinfo`). Results are cached by `SHA-256(token)` in an in-memory `Map` with a 5-minute TTL.

**Why `userinfo` over `tokeninfo`:**
- *Google's `tokeninfo`*: non-standard (`GET /tokeninfo?access_token=...`), Google-specific. MockServer doesn't replicate it.
- *`userinfo` (standard OIDC)*: both Google and MockServer expose it identically. One code path, both environments. Returns `sub`, `email`, `email_verified` — exactly what the allowlist needs.

**Why over alternatives:**
- *Local JWT validation*: impossible — Google access tokens are opaque. (Google `id_token`s are JWTs, but those are for the login flow, not bearer API auth.)
- *No caching*: one network call to the IdP per API request. At personal-tool scale this is tolerable, but the cache eliminates 99% of calls with trivial code.
- *Redis cache*: unnecessary for a single process with one user. An in-memory `Map` is fine; if the server restarts, the cache rebuilds on next request.

**Cache eviction:** entry removed on TTL expiry or when `userinfo` returns an error for a cached token (revocation detected). The `Map` is per-process; multi-process deployments would need a shared cache, but that's out of scope.

### D3: One `apiAuth` middleware handling both user and service-account tokens

A single middleware inspects the `Authorization: Bearer <token>` header, introspects via `userinfo`, and branches on the response shape:

```
userinfo response
  │
  ├─ email ends with ".iam.gserviceaccount.com"?
  │     → identityType = "service-account"
  │     → check ALLOWED_SERVICE_ACCOUNTS
  │
  └─ has sub (human user)?
        → identityType = "user"
        → check ALLOWED_GOOGLE_EMAILS
```

Both paths set `c.var.principal` with the same shape. Route handlers read `principal` uniformly.

**Why not two middlewares:** the introspection call is identical; only the allowlist check differs. Splitting would duplicate the fetch+cache logic. One middleware with a branch is simpler.

### D4: Service-account JWT signing in pure Bun (no Google SDK)

The `src/auth/sa-token.ts` utility signs a JWT using `crypto.createSign("RSA-SHA256")` from Node/Bun built-ins, then POSTs to Google's token endpoint with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`. No `googleapis` npm package, no `google-auth-library`. ~30 lines of code.

**Why:** the project's dependency policy is strict (AGENTS.md: no deps beyond Hono/HTMX/Pico/Chart.js/standard Bun libs). The signing is standard RSA-SHA256 over a small JSON payload — trivial with built-in `crypto`.

### D5: Auth routes mounted outside auth middleware; middleware mounted inside each domain

`/auth/*` routes (login, start, callback, logout) are NOT behind any auth middleware. Each domain Hono instance (`apiTrips`, `homeDomain`, `tripsDomain`, `statsDomain`) applies its own auth middleware internally — `apiTrips` applies `apiAuth` (except `/health`), each presentation domain applies `webAuth`.

**Why over a top-level `app.use("*")`:** a path-prefix check at the top level is fragile (must enumerate public paths). Per-domain mounting keeps the existing routing pattern and makes each domain self-contained — its auth policy is visible in its own file.

### D6: Env vars for allowlists, credentials, and issuer configuration

| Env var | Purpose | Used by |
|---|---|---|
| `OAUTH_ISSUER_BASE_URL` | OAuth2/OIDC issuer base URL (Google prod, MockServer dev) | all auth flows |
| `GOOGLE_WEB_CLIENT_ID` | OAuth web client ID | web auth-code flow |
| `GOOGLE_WEB_CLIENT_SECRET` | OAuth web client secret | web auth-code flow |
| `GOOGLE_WEB_REDIRECT_URI` | Callback URL (dev/prod) | web auth-code flow |
| `ALLOWED_GOOGLE_EMAILS` | Comma-separated user email allowlist | web + user-token API |
| `ALLOWED_SERVICE_ACCOUNTS` | Comma-separated SA email allowlist | service-account API |
| `JJ_SECRET` | HMAC signing key for session cookie | web session cookie |
| `GOOG_SA_KEY_PATH` | Path to SA JSON key file | `sa-token.ts` utility (scripts) |

No secrets in the database, no secrets in git. The SA key file is gitignored.

In development, `OAUTH_ISSUER_BASE_URL` points at MockServer (`http://mock-idp:1080`), and the Google-specific vars (`GOOGLE_WEB_*`) are unused (MockServer accepts any client credentials by default). In production, `OAUTH_ISSUER_BASE_URL` points at Google (`https://accounts.google.com` for authorize, `https://oauth2.googleapis.com` for token/userinfo). The authorize and token/userinfo endpoints are derived from the issuer base URL via OIDC discovery or direct path construction.

### D7: Google Cloud registration — one project, two credential types

```
Google Cloud Console (one project):
  ├── OAuth consent screen (External, Testing status, self as test user)
  ├── Credentials → OAuth client ID (Web application)
  │     → client_id + client_secret (GOOGLE_WEB_*)
  │     → Authorized redirect URIs: dev + prod
  └── IAM → Service Accounts → Create
        → juice-journal-importer@<proj>.iam.gserviceaccount.com
        → Keys → Add key (JSON) → download (gitignored, path in GOOG_SA_KEY_PATH)
```

One project, one consent screen, two credential artifacts. The web client serves both dev and prod (multiple redirect URIs). The service account serves all scripts regardless of environment.

### D8: MockServer for local development and integration testing

MockServer (`mockserver/mockserver` Docker image) replaces WireMock in the dev compose environment. It serves two roles:

1. **Mock OIDC provider**: configured via a single `PUT /mockserver/oidc` call at startup. Key configuration:
   - `opaqueAccessToken: true` — issues opaque access tokens (not JWTs), matching Google's opaque-token shape. This forces the server to introspect via `userinfo`, exercising the same code path as production.
   - `additionalClaims` — configures `sub`, `email`, `email_verified` for the dev identities (one user, one service-account).
   - Standard endpoints auto-generated: `/authorize`, `/token`, `/userinfo`, `/introspect`, `/.well-known/openid-configuration`, `/jwks.json`.

2. **Weather API mock**: MockServer is a general-purpose HTTP mock server. The weather mock expectations currently served by WireMock migrate to MockServer, eliminating one compose service.

**Initialization**: MockServer is stateless until configured. A small init script (`dev/setup-mock-idp.ts`) runs after the container starts, sending the `PUT /mockserver/oidc` request and any weather mock expectations. This can be a compose `depends_on` + an init container, or a Bun script run manually after `docker-compose up`.

**Why MockServer over mock-oauth2-server:**
- *Opaque access tokens*: MockServer's `opaqueAccessToken: true` mode matches Google's opaque tokens. mock-oauth2-server issues JWTs only, meaning tests would validate JWTs locally (via JWKS) while production introspects opaque tokens — different code paths. With MockServer, the test path == the prod path.
- *One-call setup*: `PUT /mockserver/oidc` with a flat JSON body. No config file, no request-param matching.
- *Replaces WireMock*: reduces compose service count by one.
- *Device flow support*: MockServer generates `/device_authorization` endpoint (RFC 8628), future-proofing CLI testing.

**Why not just use `AUTH_MODE=dev` bypass:**
- A bypass that skips auth entirely doesn't test the auth middleware, cookie signing, introspection, or allowlist logic. MockServer tests all of it with zero Google dependency.
- The `OAUTH_ISSUER_BASE_URL` approach means no code branching between dev and prod — just a different env var. No `if (AUTH_MODE === "dev")` guards in the auth module.

## Risks / Trade-offs

- **[Opaque tokens require network introspection]** → Cached 5 min per token. At personal-tool scale, one IdP call per 5 minutes per token is negligible. If the IdP is down, cached tokens continue to work until TTL; new tokens fail. Acceptable for a personal tool.
- **[Service-account key is a long-lived private key on disk]** → Gitignored, project-scoped, rotatable via Google IAM (delete + create new key). Single key for a single-user tool. If leaked, rotate in IAM — no database migration, no user re-enrollment.
- **[Session cookie not revocable without expiry]** → The server can't revoke a valid signed cookie before its 7-day expiry without a revocation list (which would require storage). Mitigation: 7-day TTL is short enough that re-login is cheap; if urgent, rotate `JJ_SECRET` (invalidates all cookies). For a single-user tool, this is acceptable.
- **[Google `userinfo` rate limits]** → 1 call per 5 min per token, well within Google's limits. MockServer has no rate limits in dev.
- **[Consent screen in "Testing" status limits to 100 test users]** → Fine for a single-user tool. Publishing the consent screen (verification) would be needed only if other users are added later.
- **[MockServer replaces WireMock]** → Weather mock expectations must be migrated to MockServer's expectation format. MockServer supports the same request-matching + response stubbing. Low risk — weather mocks are simple JSON file responses.
- **[MockServer init is a separate step]** → MockServer is unconfigured until the `PUT /mockserver/oidc` call lands. If the init script doesn't run, auth flows fail against an unconfigured mock. Mitigation: init script runs as a compose dependency or as part of `bun dev` startup.
- **[`apiAuth` and `webAuth` are separate middlewares]** → Slight duplication in allowlist-check logic. Acceptable — the two paths return different error formats (401 JSON vs 302 redirect) and read different transport (header vs cookie), so merging would add branching complexity for little gain.

## Migration Plan

**Deploy:**
1. Register Google OAuth web client + service account in Google Cloud Console.
2. Set the eight new environment variables (in `.env` for dev, in the compose/Docker env for prod). In dev, `OAUTH_ISSUER_BASE_URL` points at MockServer.
3. Add MockServer service to compose (replacing WireMock). Migrate weather mock expectations to MockServer.
4. Deploy the new code. Existing anonymous requests to `/api/*` will start receiving `401`; web requests will redirect to `/auth/login`.
5. No database migrations.

**Rollback:**
1. Remove auth middleware from routes and `/auth/*` routes from `index.ts`.
2. Delete `src/auth/` module.
3. Unset the new environment variables.
4. Restore WireMock in compose (or keep MockServer for weather only, remove OIDC config).
5. No database migrations to reverse. Handlers that don't read `principal` are unaffected; the `Env` type extension is additive.

## Open Questions

- Should the web session cookie carry a refresh mechanism (short TTL + silent re-validation against the IdP), or is the fixed 7-day TTL sufficient for a single-user tool? (Current design: fixed 7-day TTL; revisit if session revocation becomes a concern.)
- Should `apiAuth` also accept `id_token` JWTs (validatable locally via JWKS, no network call) as an alternative to opaque access tokens, to eliminate introspection entirely? (Deferred — the introspection cache makes this unnecessary at current scale, and MockServer's opaque-token mode ensures the introspection path is tested.)