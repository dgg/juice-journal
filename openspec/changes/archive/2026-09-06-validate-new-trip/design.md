## Context

See `proposal.md` — Why. The current `htmlCreationHandler` (`src/backend/presentation/trips.tsx:116`) does all validation in its body: manual form parsing (`parseFormTripInput`), `tripInputSchema.parse()` (throws `ZodError` → 500), and three throw-based consistency validators (`ProblemDetailsError` → 422 JSON). The global `app.onError` in `index.ts` is currently commented out, so both error types become bare 500s. The API (`src/backend/api/trips.ts`) already uses the clean pattern: `zValidator` middleware + throwing consistency middleware + 4-line handler. This change brings the form path to the same structural cleanliness, with an HTML renderer instead of JSON.

## Goals / Non-Goals

**Goals:**
- Move form validation out of the handler into symmetric middlewares (schema + consistency)
- Surface validation errors to the UI via Pico CSS validation states (`aria-invalid` + `<small>`)
- Keep the presentation layer Zod-only (no `ProblemDetailsError` imports)
- Add a global HTML error page for non-validation failures

**Non-Goals:**
- Changing the API's validation or error handling (API keeps `problemDetailsHandler` + throw-based validators)
- Modifying the API's consistency validators (`src/backend/api/validators.ts`) — the user will add `message` fields manually
- Per-field OOB HTMX swaps (whole-form re-render chosen)
- Client-side JavaScript validation beyond HTML5 native attributes already present

## Decisions

### Decision 1: Form uses its own return-based consistency validators (option b)

**Choice:** Create `src/backend/presentation/formValidators.ts` with validators that return `ZodIssue[]` instead of throwing `ProblemDetailsError`. They reuse the same DB queries (`vehiclesQueries.vehicleExists`, `tripsQueries.existsTripByVehicleAndEndTime`, `tripsQueries.findLatestOdometerForVehicle`) but wrap results in Zod issues, not problem envelopes.

**Rationale:** The presentation layer stays purely Zod-speaking — one error vocabulary, one mapper (`ZodIssue[] → Record<field, message>`), no `hono-problem-details` import. This respects the boundary the user drew ("problems are API-only"). The middleware checks `.length > 0` and renders — no `try/catch`, symmetric with the schema middleware.

**Alternatives considered:**
- **(a) Reuse API validators + catch `ProblemDetailsError`:** re-couples presentation to the API's error type, forces two mappers (Zod + Problem), makes the consistency middleware a try/catch body. Rejected — user explicitly preferred not to catch.
- **(c) Extract neutral core + wrap per layer:** adds a new "neutral issue" type and touches `api/validators.ts` (API-owned). Over-abstraction for 3 validators. Held as a future option.

### Decision 2: `safeParse` middleware instead of `zValidator` hook

**Choice:** The schema middleware uses `tripFormSchema.safeParse(body)` directly and renders on failure, rather than `zValidator("form", schema, htmlFormHook)`.

**Rationale:** `zValidator`'s hook would need to fetch vehicles to re-render — I/O at the validation layer. A plain middleware with `safeParse` makes both middlewares structurally identical (parse/check → render-or-next) and keeps the handler clean. The cost is losing `c.req.valid("form")` (we use `c.set("tripInput", result.data)` instead) — minor.

**Alternative:** `zValidator("form", schema, htmlFormHook)` mirrors the API's tool choice but creates asymmetry (hook vs middleware) and pushes I/O into the validation hook.

### Decision 3: `tripFormSchema` in `types.ts`, reusing shared Zod leaves

**Choice:** Define `tripFormSchema` alongside `tripInputSchema` in `src/backend/types.ts`, reusing `nanoid`, `daypart`, and `location` leaves. It models form fields as strings and `.transform()`s into `TripInput`. Enforces `distance > 0` post-transform and `end_time > start_time` as a field-level error on `end_time`.

**Rationale:** Zod error paths land directly on form field names (`trip_date`, `start_time`, `distance`) — no adapter needed. Retires the manual `parseFormTripInput` (and its direct `process.env.DISPLAY_TZ` read, replaced by the shared `displayTz()` util). Reuse of leaves keeps the two schemas from drifting on shared constraints.

### Decision 4: Whole-form re-render with `hx-swap="outerHTML"`

**Choice:** On `422`, the middleware returns the entire `TripFormPage` re-rendered with errors + repopulated values. The form carries `hx-swap="outerHTML"` so HTMX replaces it in place.

**Rationale:** Matches the htmx.org inline-validation pattern. One form, small — per-field OOB swaps would over-engineer. Preserved values come from the submitted body; defaults (current time, daypart locations) come from the existing `getTripFormPage` logic, factored into a shared `buildTripFormProps(c, { submitted?, errors? })` helper.

### Decision 5: Global HTML `onError` for presentation, API `onError` unchanged

**Choice:** Uncomment `app.onError` in `index.ts` but replace `problemDetailsHandler` with an HTML renderer that renders `<ErrorPage />` (a new Pico-styled component) for non-validation failures. `apiTrips.onError(problemDetailsHandler(...))` stays as-is.

**Rationale:** Validation failures never reach `onError` (middlewares return, not throw). Only genuine unhandled failures (DB down, unexpected errors) hit this handler. The API already owns its own `onError`; the global handler only sees presentation-route errors. The handler logs via the structured logger and renders a generic message — no stack traces to the user.

## Risks / Trade-offs

- **Validator duplication (API throws, form returns):** the form validators duplicate ~2 lines of envelope logic per validator. Mitigation: both share the same DB queries; the duplication is thin and the ownership boundary is clean. If the validator set grows, revisit option (c).
- **`tripFormSchema` drift from `tripInputSchema`:** two schemas sharing leaves but with different input shapes. Mitigation: shared leaves (`nanoid`, `daypart`, `location`) are the constraints most likely to change; the form schema's transform logic is form-specific and unlikely to drift.
- **`safeParse` middleware bypasses `zValidator`'s hooks:** no `c.req.valid("form")` — values passed via `c.set/c.get`. Mitigation: the handler reads `c.get("tripInput")`, typed as `TripInput`. Minor ergonomic cost.
- **`app.onError` is domain-wide:** the HTML error handler is registered on the root `app`, but `apiTrips` has its own `onError` that intercepts first — API errors won't reach the HTML handler. Presentation domains (home, stats, summary, trips) share it. A 500 on a stats page would render `ErrorPage` — acceptable.
- **Existing tests (`home.test.ts`) assert current 500 behavior:** the test covering `htmlCreationHandler` may expect a 500 on bad input. Mitigation: update the test to expect 422 HTML with field errors during implementation.

## Migration Plan

1. Add `tripFormSchema` to `types.ts` (additive, no breakage).
2. Add `formValidators.ts` (additive).
3. Add `buildTripFormProps` helper and `renderTripForm` helper.
4. Rewrite the `POST /` route in `tripsDomain` to use the two middlewares + clean handler.
5. Update `TripFormPage` to accept `errors` + `submitted` props and render `aria-invalid` + `<small>`.
6. Add `ErrorPage` component.
7. Replace `app.onError` in `index.ts` with the HTML error handler.
8. Remove `parseFormTripInput` and `FormBody`.
9. Update tests.
10. Add `.form-error` CSS to `public/app.css`.

**Rollback:** revert the commit. The old handler path is in git history; new files are additive and deletable. No DB migration involved.
