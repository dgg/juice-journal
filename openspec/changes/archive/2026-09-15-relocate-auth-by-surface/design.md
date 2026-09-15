## Context

Auth code currently lives entirely under `src/auth/` — 11 source files plus their tests. The `src/backend/` tree already organizes by surface: `api/` for API handlers, `presentation/` for web/HTMX handlers. Auth code is the outlier: it's consumed by both surfaces but lives in a flat bucket that matches neither.

## Goals / Non-Goals

**Goals:**

- Co-locate auth code with the surface that uses it: API auth under `api/auth/`, web auth under `presentation/auth/`
- Keep genuinely shared code (types, allowlist, discovery, sa-token) in a shared `backend/auth/` that both surfaces and CLI importers can import
- Keep tests next to their production code (each `*.test.ts` moves with its subject)
- Maintain all tests passing and TypeScript compiling after the move

**Non-Goals:**

- No auth logic changes — no function bodies, signatures, or behavior altered
- No API endpoint changes — routes, middleware behavior, and response shapes are identical
- No new dependencies or configuration changes
- No splitting of `integration.test.ts` — it stays as one shared file in `backend/auth/`

## Decisions

### Decision: Three-bucket split by consumer surface

```
src/backend/auth/           ← SHARED (api + web + CLI importers)
src/backend/api/auth/       ← API-only
src/backend/presentation/auth/  ← WEB-only
```

**Rationale:** The dependency graph partitions cleanly — `api-auth` and `introspect`+`token-cache` are only imported by `api/trips.ts`; `web-auth`, `auth-routes`, `cookie`, `oauth-callback` are only imported by presentation routes + `index.ts`; `types`, `allowlist`, `discovery`, `sa-token` are imported by both surfaces (and CLI importers use `sa-token`). No file is ambiguously shared.

**Alternative considered:** Keep `token-cache.ts` in shared `backend/auth/` since it's a generic utility. Rejected — it's only consumed by `introspect.ts` (API path), and there's no current web-side caching need. YAGNI.

### Decision: `sa-token.ts` stays in shared `backend/auth/`

**Rationale:** CLI importers (outside the server) import `mintServiceAccountToken` to mint tokens for API calls. It must be importable without pulling in API-specific or presentation-specific code. Placing it in `backend/auth/` keeps it accessible to both the server and CLI scripts.

### Decision: `integration.test.ts` lives in shared `backend/auth/`

**Rationale:** It exercises the full auth flow (API + web together against MockServer). It belongs in the shared bucket since it crosses both surfaces. Keeping it as one file avoids artificial fragmentation of an end-to-end test.

### Decision: Internal cross-references use relative paths adjusted per new depth

Each moved file's internal imports to other moved files shift `./` to `../../auth/` or `./` depending on whether the target is shared or in the same bucket. External consumers (`index.ts`, `trips.ts`, presentation routes) update their import paths to the new locations.

## Risks / Trade-offs

- **[Risk] Import path drift in test files]** → Tests move with their subjects and their internal imports update the same way. Running `bun test` after each bucket's move catches breakage immediately.
- **[Risk] `logger.ts` Env type import breaks]** → `logger.ts` imports `Principal` from `../auth/types` today; after the move, `types.ts` lands at `backend/auth/types.ts` — same relative depth from `backend/utils/logger.ts` (`../auth/types`), so no change needed.
- **[Trade-off: deeper import paths]** → Some consumers gain one directory level (`../../auth/` → `../../auth/` or `./auth/`). This is the cost of co-location — the import paths now reflect the actual dependency surface.
