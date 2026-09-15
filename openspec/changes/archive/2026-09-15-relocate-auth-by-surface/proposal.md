## Why

All auth code lives in a single `src/auth/` directory outside the areas that consume it. API auth middleware, web auth middleware, and presentation auth routes are all in one bucket regardless of which surface they serve. Auth code should live closer to where it is used — API auth under `src/backend/api/auth/`, web auth under `src/backend/presentation/auth/`, and only genuinely shared code under `src/backend/auth/`.

## What Changes

- Move `api-auth.ts`, `introspect.ts`, `token-cache.ts` (and their tests) from `src/auth/` to `src/backend/api/auth/`
- Move `web-auth.ts`, `auth-routes.tsx`, `cookie.ts`, `oauth-callback.ts` (and their tests) from `src/auth/` to `src/backend/presentation/auth/`
- Move `types.ts`, `allowlist.ts`, `discovery.ts`, `sa-token.ts` (and their tests) plus `integration.test.ts` from `src/auth/` to `src/backend/auth/` (shared between API, web, and CLI importers)
- Update all import paths in consumers (`backend/index.ts`, `backend/api/trips.ts`, `backend/presentation/{trips,home,stats}/*.tsx`, `backend/utils/logger.ts`)
- Update internal cross-references between moved auth files
- Delete `src/auth/` directory entirely
- No logic changes — pure file relocation and import path updates

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — pure structural refactor, no behavior changes. `skip_specs: true`.

## Impact

- **Affected code**: `src/auth/*` (21 files moved/deleted), `src/backend/index.ts`, `src/backend/api/trips.ts`, `src/backend/presentation/{trips,home,stats}/*.tsx`, `src/backend/utils/logger.ts`
- **APIs**: No API changes
- **Dependencies**: No dependency changes
- **Rollback**: Revert the commit — all changes are file moves and import path edits with no logic changes. Git tracks the moves as renames.
