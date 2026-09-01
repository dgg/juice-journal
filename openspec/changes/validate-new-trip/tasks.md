## 1. Schema layer

- [ ] 1.1 Define `tripFormSchema` in `src/backend/types.ts` — Zod object modeling form fields as strings (`trip_date`, `start_time` `HH:mm`, `end_time` `HH:mm`, `distance` string, `daypart`, `vehicle_id` nanoid, optional `speed`/`consumption`/`odometer` strings, `start_location`/`end_location` optional location enum). Reuse shared leaves (`nanoid`, `daypart`, `location`) from existing `tripInputSchema`.
- [ ] 1.2 Add `.transform()` to `tripFormSchema` that combines `trip_date` + `start_time`/`end_time` via Luxon with `displayTz()` into ISO datetimes with local offset, computes `duration` in minutes, parses string numbers to numbers, and outputs `TripInput`. Enforce `distance > 0` post-transform. Reject `end_time` not after `start_time` with a field-level Zod error on `end_time`.
- [ ] 1.3 Verify `tripFormSchema.safeParse` produces `TripInput`-typed output on valid input and `ZodIssue[]` with correct field paths on invalid input.

## 2. Form consistency validators

- [ ] 2.1 Create `src/backend/presentation/formValidators.ts` with three return-based validators: `checkVehicleExists(input): Promise<ZodIssue[]>`, `checkTripConflict(input): Promise<ZodIssue[]>`, `checkOdometerMonotonicity(input): Promise<ZodIssue[]>`. Each reuses the same DB queries as the API validators (`vehiclesQueries.vehicleExists`, `tripsQueries.existsTripByVehicleAndEndTime`, `tripsQueries.findLatestOdometerForVehicle`) but returns `ZodIssue[]` instead of throwing `ProblemDetailsError`. Each issue SHALL carry a `message` and a `path` matching the form field name.
- [ ] 2.2 Add an aggregator `validateTripFormConsistency(input: TripInput): Promise<ZodIssue[]>` that runs all three checks and concatenates the results.
- [ ] 2.3 Verify no import of `hono-problem-details` or `ProblemDetailsError` in `formValidators.ts` or anywhere in `src/backend/presentation/`.

## 3. Error mapping helper

- [ ] 3.1 Create a `zodIssuesToFieldMap(issues: ZodIssue[]): Record<string, string>` helper that flattens `ZodIssue[]` into a `Record<fieldName, message>`. If multiple issues share a path, keep the first. Place it alongside the form validators or in a shared utils location.

## 4. Form rendering with errors

- [ ] 4.1 Extract a `buildTripFormProps(c, { submitted?, errors? })` helper in `src/backend/presentation/trips.tsx` that fetches vehicles + default vehicle id (reusing `getTripFormPage`'s logic) and merges in submitted values (for repopulation) and an error map. When `submitted` is absent, returns the render-time defaults (current time, daypart-derived locations).
- [ ] 4.2 Add `errors?: Record<string, string>` and `submitted?: Record<string, string>` props to `TripFormPageProps` in `src/frontend/pages/TripFormPage.tsx`.
- [ ] 4.3 Update each input in `TripFormPage` to set `value`/`selected`/`checked` from `submitted` when present (repopulation), and `aria-invalid={!!errors[field]}` + `aria-describedby={errors[field] ? `${field}-err` : undefined}` when the field has an error. Render a `<small id={`${field}-err`} class="form-error">{errors[field]}</small>` after each erroring input.
- [ ] 4.4 Add `hx-swap="outerHTML"` to the `<form>` element in `TripFormPage`.
- [ ] 4.5 Add `.form-error` rule to `public/app.css` — color via `--pico-form-element-invalid-border-color` (or a related `--pico-*` variable). No inline `<style>`.

## 5. Route middlewares + clean handler

- [ ] 5.1 Create `schemaMiddleware` in `src/backend/presentation/trips.tsx`: parse body via `c.req.parseBody()`, run `tripFormSchema.safeParse(body)`, on failure return `c.html(<TripFormPage {...buildTripFormProps(c, { submitted: body, errors: zodIssuesToFieldMap(result.error.issues) })} />, 422)`, on success `c.set("tripInput", result.data)` and `await next()`.
- [ ] 5.2 Create `consistencyMiddleware`: read `c.get("tripInput")`, run `validateTripFormConsistency(input)`, if issues returned render form with errors (422 HTML via `buildTripFormProps`), else `await next()`.
- [ ] 5.3 Rewrite `htmlCreationHandler` to a 3-line happy path: `await tripsQueries.createTrip(c.get("tripInput"))`, set `HX-Redirect: /` if HTMX request, return `c.text("", 200)` (or `c.redirect("/")` for non-HTMX).
- [ ] 5.4 Update `tripsDomain.post("/", ...)` to chain `schemaMiddleware`, `consistencyMiddleware`, `htmlCreationHandler`.
- [ ] 5.5 Remove `parseFormTripInput` function and `FormBody` interface from `trips.tsx`.

## 6. Global HTML error page

- [ ] 6.1 Create `src/frontend/pages/ErrorPage.tsx` — a Pico-styled error page component with a generic user-facing message ("Something went wrong"). No raw error message or stack trace in the output.
- [ ] 6.2 Uncomment `app.onError` in `src/backend/index.ts` and replace `problemDetailsHandler(...)` with a handler that logs the error via the structured logger (`c.var.logger.error({ err, method, path })`) and returns `c.html(<ErrorPage />, 500)`.
- [ ] 6.3 Verify API routes (`/api/*`) still use `apiTrips.onError(problemDetailsHandler(...))` and are unaffected — errors from `/api/*` SHALL NOT render the HTML error page.

## 7. Tests

- [ ] 7.1 Update `src/backend/home.test.ts` (or the relevant test covering `htmlCreationHandler`) — flip expectations from 500 on bad input to 422 HTML with field errors. Assert response status, `text/html` content type, and presence of `aria-invalid` on the offending field.
- [ ] 7.2 Add tests for `tripFormSchema.safeParse` — valid input produces `TripInput`, invalid input produces `ZodIssue[]` with correct field paths (missing distance, end before start, invalid daypart).
- [ ] 7.3 Add tests for `formValidators` — non-existent vehicle returns issue on `vehicle_id`, odometer lower than last returns issue on `odometer`, duplicate trip returns issue on `end_time`, valid input returns empty array.
- [ ] 7.4 Add test for `zodIssuesToFieldMap` — flattens multiple issues into `Record<field, message>`, keeps first on duplicate paths.
- [ ] 7.5 Run `bun test` and `bun check` — all pass, no type errors.

## 8. Verification

- [ ] 8.1 Run `docker build .` — Docker build succeeds.
- [ ] 8.2 Manual check: submit the trip form with an empty distance field — form re-renders with `aria-invalid` on distance and a `<small>` message, other fields repopulated.
- [ ] 8.3 Manual check: submit with a non-existent vehicle — form re-renders with error on the vehicle field.
- [ ] 8.4 Manual check: submit a valid trip — redirects to home page, trip appears in the list.
