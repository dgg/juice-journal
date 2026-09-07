## Why

The trip creation form (`POST /trips`, HTML) fails validation invisibly: schema failures and consistency failures throw from inside the handler and become bare `500`s with no field-level feedback. The form re-renders nothing, repopulates nothing, and the user has no idea why their trip didn't save. Validation also lives in the handler body rather than as middleware, diverging from the API's clean `zValidator` + middleware + handler shape. Issue #24.

## What Changes

- **Form validation moves out of the handler into two symmetric middlewares.** A schema middleware runs `tripFormSchema.safeParse` and renders the form with errors on failure; a consistency middleware runs return-based form validators and renders the form with errors on failure. The handler becomes a 3-line happy path (create + redirect).
- **New `tripFormSchema` (Zod)** models the actual form fields as strings (`trip_date`, `start_time` as `HH:mm`, etc.) and transforms them into the `TripInput` shape, retiring the manual `parseFormTripInput`. Reuses shared leaves (`nanoid`, `daypart`, `location`) from `types.ts`. Zod error paths land on form field names.
- **New return-based form consistency validators** in `src/backend/presentation/formValidators.ts` — parallel to the API's throw-based ones but returning `ZodIssue[]` (no `ProblemDetailsError`). The form path speaks Zod end-to-end; the presentation layer never imports `hono-problem-details`.
- **`TripFormPage` renders validation state.** Inputs carry `aria-invalid` + `aria-describedby`; each erroring field gets a `<small>` message. Re-rendered form repopulates submitted values. Pico v2 validation states applied via `aria-invalid`; minimal custom CSS for the `<small>` message color lives in `public/app.css` as a `--pico-*` override.
- **Form uses `hx-swap="outerHTML"`** so the 422 response replaces the form in place.
- **Global HTML error page** via a new `app.onError` for non-validation failures (DB down, unexpected errors) — a Pico-styled `ErrorPage` component. API errors keep flowing through `apiTrips.onError(problemDetailsHandler(...))` unchanged.
- **`parseFormTripInput` and its `FormBody` interface removed.**

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `trip-input-form`: form validation rendering — schema and consistency failures produce a 422 HTML re-render with per-field `aria-invalid` + `<small>` messages and repopulated values; validation moves to symmetric middlewares; `tripFormSchema` replaces the manual parser.
- `error-handling`: non-validation failures in presentation domains render an HTML error page (500) instead of a bare text response; API problem-details handling is unchanged.

## Impact

- **Code:** `src/backend/presentation/trips.tsx` (handler + middlewares), new `src/backend/presentation/formValidators.ts`, new `tripFormSchema` in `src/backend/types.ts`, `src/frontend/pages/TripFormPage.tsx`, new `src/frontend/pages/ErrorPage.tsx`, `src/backend/index.ts` (`app.onError`), `public/app.css`.
- **APIs:** `POST /trips` (HTML) behavior changes — 422 HTML on validation failure instead of 500. `POST /api/trips` unchanged.
- **Dependencies:** none added.
- **Tests:** `src/backend/home.test.ts` covers `htmlCreationHandler` — expectations flip from 500 to 422 HTML with field errors.

## Rollback

Revert the commit. The handler-based `parseFormTripInput` + `tripInputSchema.parse` path can be restored from git history. The new files (`formValidators.ts`, `ErrorPage.tsx`) are additive and safe to delete. No database or schema migration is involved.
