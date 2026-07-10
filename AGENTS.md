# agents.md 🤖

Instructions for AI agents on `juice-journal`.

---

## Stack
* **Backend:** Bun + Hono (lightweight framework)  
* **Frontend:** HTMX (server-side interactions) + Pico CSS (styling). Semantic HTML only; no custom CSS or client-side frameworks.  
* **Charts:** Chart.js for data visualization (approved dependency)  
* **Database:** Hosted PostgreSQL  
* **Deployment:** Docker container  

---

## What You Can Do
✅ Add features, fix bugs, refactor code  
✅ Update tests, docs, dependencies (within constraints)  
✅ Improve performance, error handling, UI  

## What Requires Human Review
❌ Database schema changes  
❌ Breaking or renaming public API endpoints  
❌ Changing trip data structure (`distance_km`, `avg_speed_kmh`, `consumption_kwh_100km`, `timestamp`)  
❌ Adding dependencies beyond Hono, HTMX, Pico CSS, Chart.js, and standard Bun libs  
❌ Writing custom CSS or client-side frameworks (stay semantic + Pico)  

---

## Rules

### Commits
* **Convention:** `type(scope): description` — all lowercase  
* **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`  
* **Link issues:** Use `fixes #123` or `closes #456` in commit body to auto-link GitHub issues  

### Data & API
* **Trip fields:** `distance_km`, `avg_speed_kmh`, `consumption_kwh_100km`, `timestamp`  
* **Default:** Timestamps → `NOW()` if not provided  
* **Odometer:** Optional  
* **API:** Extend endpoints, never break them  

### Before Committing
1. Run tests: `bun test` (or repo default)  
2. Verify Docker builds: `docker build .`  
3. Check for unnecessary dependencies  

### File Locations
```
src/backend/   # Hono routes & handlers
src/frontend/  # HTMX templates (HTML + Pico CSS)
src/db/        # Migrations, schema, queries
src/utils/     # Shared helpers
```

---

## When to Ask
* "Should we change the trip schema?"  
* "Can I add [dependency]?"  
* "Is this API design OK?"  

**Otherwise, proceed with confidence.**
