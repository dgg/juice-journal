# agents.md 🤖

Instructions for AI agents on `juice-journal`.

---

## Stack

- **Backend:** Bun (/oven-sh/bun v1.3.10/latest) + Hono (/honojs/website, /honojs/hono, /honojs/middleware). Zod validation (/colinhacks/zod) with problem details (https://github.com/paveg/hono-problem-details)
- **Frontend:** HTMX (server-side interactions, /bigskysoftware/htmx) + Pico CSS (styling, /picocss/pico v2.1.1). Semantic HTML only; no custom CSS or client-side frameworks.
- **Charts:** Chart.js (/chartjs/chart.js v4.5.1) for data visualization (approved dependency)
- **Database:** Hosted PostgreSQL (v17.10) using nanoid as PKs
- **Deployment:** Docker container

---

## What You Can Do

✅ Add features, fix bugs, refactor code
✅ Update tests, docs, dependencies (within constraints)
✅ Improve performance, error handling, UI

## What Requires Human Review

❌ Database schema changes
❌ Breaking or renaming public API endpoints
❌ Changing trip data structure
❌ Adding dependencies beyond Hono, HTMX, Pico CSS, Chart.js, and standard Bun libs
❌ Writing custom CSS or client-side frameworks (stay semantic + Pico)

---

## Rules

### Styling

All generated code must follow the rules stated in `.editorconfig` and `.prettierrc`.

### Documentation

Always use Context7 when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

Stack description contains libray identifier and version (if version missing, it is in package.json).

### Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of other test runners
- Use `bun build <file.html|file.ts|file.css>` instead of other builders
- Use `bun install` to install dependencies when allowed to do so
- Use `bun run <script>` to run custom scripts
- Use `bunx <package> <command>` to run packages
- Bun automatically loads .env, so don't use dotenv.

Use internal Bun APIs when possible (`Bun.sql`, `Bun.file`, ...) by default instead of other popular packages.

### Commits

- **Conventional Commits:** usual types `type(scope): description` — all lowercase
- **Link issues:** Use `fixes #123` or `closes #456` in commit body to auto-link GitHub issues
- **Feature branches**: do not use git worktrees

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

- "Should we change the trip schema?"
- "Can I add [dependency]?"
- "Is this API design OK?"

**Otherwise, proceed with confidence.**
