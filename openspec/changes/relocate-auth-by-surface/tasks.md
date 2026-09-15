## 1. Move shared auth code to `src/backend/auth/`

- [ ] 1.1 `git mv src/auth/types.ts src/backend/auth/types.ts`
- [ ] 1.2 `git mv src/auth/allowlist.ts src/backend/auth/allowlist.ts`
- [ ] 1.3 `git mv src/auth/discovery.ts src/backend/auth/discovery.ts`
- [ ] 1.4 `git mv src/auth/sa-token.ts src/backend/auth/sa-token.ts`
- [ ] 1.5 `git mv src/auth/sa-token.test.ts src/backend/auth/sa-token.test.ts`
- [ ] 1.6 `git mv src/auth/allowlist.test.ts src/backend/auth/allowlist.test.ts`
- [ ] 1.7 `git mv src/auth/integration.test.ts src/backend/auth/integration.test.ts`
- [ ] 1.8 Update `src/backend/auth/sa-token.ts` internal import: `./discovery` stays `./discovery` (same bucket)
- [ ] 1.9 Update `src/backend/utils/logger.ts` import: `../../auth/types` stays `../auth/types` (same relative depth — `backend/utils/` to `backend/auth/`)
- [ ] 1.10 Verify `bun check` passes after shared move

## 2. Move API-only auth code to `src/backend/api/auth/`

- [ ] 2.1 `git mv src/auth/api-auth.ts src/backend/api/auth/api-auth.ts`
- [ ] 2.2 `git mv src/auth/introspect.ts src/backend/api/auth/introspect.ts`
- [ ] 2.3 `git mv src/auth/token-cache.ts src/backend/api/auth/token-cache.ts`
- [ ] 2.4 `git mv src/auth/api-auth.test.ts src/backend/api/auth/api-auth.test.ts`
- [ ] 2.5 `git mv src/auth/introspect.test.ts src/backend/api/auth/introspect.test.ts`
- [ ] 2.6 `git mv src/auth/token-cache.test.ts src/backend/api/auth/token-cache.test.ts`
- [ ] 2.7 Update `src/backend/api/auth/api-auth.ts` imports: `../backend/utils/logger` → `../../utils/logger`, `./introspect` stays `./introspect`, `./allowlist` → `../../auth/allowlist`, `./types` → `../../auth/types`
- [ ] 2.8 Update `src/backend/api/auth/introspect.ts` imports: `./token-cache` stays `./token-cache`, `./types` → `../../auth/types`, `./discovery` → `../../auth/discovery`
- [ ] 2.9 Update `src/backend/api/auth/introspect.test.ts` imports: `./introspect` stays `./introspect`, `./discovery` → `../../auth/discovery`
- [ ] 2.10 Update `src/backend/api/auth/api-auth.test.ts` imports: `./api-auth` stays `./api-auth`, `./allowlist` → `../../auth/allowlist`, `./introspect` → `./introspect` (or `./` stays), `./discovery` → `../../auth/discovery`
- [ ] 2.11 Update `src/backend/api/trips.ts` import: `../../auth/api-auth` → `./auth/api-auth`
- [ ] 2.12 Verify `bun check` passes after API move

## 3. Move web-only auth code to `src/backend/presentation/auth/`

- [ ] 3.1 `git mv src/auth/web-auth.ts src/backend/presentation/auth/web-auth.ts`
- [ ] 3.2 `git mv src/auth/auth-routes.tsx src/backend/presentation/auth/auth-routes.tsx`
- [ ] 3.3 `git mv src/auth/cookie.ts src/backend/presentation/auth/cookie.ts`
- [ ] 3.4 `git mv src/auth/oauth-callback.ts src/backend/presentation/auth/oauth-callback.ts`
- [ ] 3.5 `git mv src/auth/web-auth.test.ts src/backend/presentation/auth/web-auth.test.ts`
- [ ] 3.6 `git mv src/auth/cookie.test.ts src/backend/presentation/auth/cookie.test.ts`
- [ ] 3.7 Update `src/backend/presentation/auth/web-auth.ts` imports: `../backend/utils/logger` → `../../utils/logger`, `./cookie` stays `./cookie`, `./allowlist` → `../../auth/allowlist`, `./types` → `../../auth/types`
- [ ] 3.8 Update `src/backend/presentation/auth/auth-routes.tsx` imports: `../backend/utils/logger` → `../../utils/logger`, `./cookie` stays `./cookie`, `./allowlist` → `../../auth/allowlist`, `./oauth-callback` stays `./oauth-callback`, `./discovery` → `../../auth/discovery`, `../frontend/pages/LoginPage` → `../../../frontend/pages/LoginPage`
- [ ] 3.9 Update `src/backend/presentation/auth/oauth-callback.ts` import: `./discovery` → `../../auth/discovery`
- [ ] 3.10 Update `src/backend/presentation/auth/web-auth.test.ts` imports: `./web-auth` stays `./web-auth`, `./cookie` stays `./cookie`, `./allowlist` → `../../auth/allowlist`
- [ ] 3.11 Update `src/backend/presentation/home/home.tsx` import: `../../../auth/web-auth` → `../auth/web-auth`
- [ ] 3.12 Update `src/backend/presentation/trips/trips.tsx` import: `../../../auth/web-auth` → `../auth/web-auth`
- [ ] 3.13 Update `src/backend/presentation/stats/stats.tsx` import: `../../../auth/web-auth` → `../auth/web-auth`
- [ ] 3.14 Update `src/backend/index.ts` import: `../auth/auth-routes.tsx` → `./presentation/auth/auth-routes.tsx`
- [ ] 3.15 Verify `bun check` passes after web move

## 4. Cleanup and validation

- [ ] 4.1 Delete `src/auth/` directory (should be empty after all moves)
- [ ] 4.2 Run `bun test` — all tests pass
- [ ] 4.3 Run `bun check` — TypeScript compiles without errors
- [ ] 4.4 Run `docker build .` — Docker image builds successfully
