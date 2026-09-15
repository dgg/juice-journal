## Context

See proposal.md for motivation. The project has a self-contained multi-stage `Dockerfile` (no SDK needed in the runner to build) and an existing `container-deployment` spec covering image construction. This change adds the CI/CD layer only — no Dockerfile or compose changes.

## Goals / Non-Goals

**Goals:**
- Build and push on every `main` push with zero manual steps.
- Keep the workflow structure close to the nmoneys reference (single job, single file).
- Make the Dockerfile `ARG` default the canonical base image tag in CI (no `--build-arg`).

**Non-Goals:**
- Running tests or coverage in CI (deferred).
- Multi-environment deploys or branch-based matrix builds.
- Managing GHCR package visibility or Render registry credentials (configured on the Render side).

## Decisions

### D1: `docker buildx build --push` in one step (vs. build then push)

The runner ships buildx preinstalled, so no `docker/setup-buildx-action` step is needed. `buildx build --push` makes build and push atomic in a single step — closest to nmoneys' single `dotnet publish` step. No `--build-arg BUN_IMAGE_TAG` is passed; the Dockerfile `ARG` default applies, mirroring how `dotnet` reads `global.json` with no flag.

**Alternative considered:** separate `docker build` + `docker push`. Rejected — two commands add a local-daemon round-trip for no benefit when buildx is available.

### D2: Tag with `latest` + `sha-<short-sha>`

`latest` keeps the Render deploy hook simple (Render pulls `latest`). `sha-<short-sha>` (first 7 chars of `github.sha`) enables rollback to any prior commit and auditability. Both tags point at the same image digest.

**Alternative considered:** semver tags. Rejected — requires a release/tag step and version bookkeeping that a personal project doesn't need yet.

### D3: No `docker/setup-buildx-action`

`ubuntu-latest` includes buildx out of the box. Adding the setup action is unnecessary for a single-builder, single-platform build. Keeps the workflow lean.

### D4: No `docker/login-action`

Following nmoneys' pattern: `echo "$GITHUB_TOKEN" | docker login ghcr.io -u ${{ github.actor }} --password-stdin`. A raw `docker login` is simpler than the action and keeps the workflow dependency-free.

### D5: Render deploy via `curl` to a hook secret

Mirrors nmoneys exactly. The `RENDER_DEPLOY_HOOK` secret holds the hook URL; `curl "$RENDER_DEPLOY_HOOK"` triggers a Render redeploy that pulls the new `:latest` image. The deploy step depends on the push step succeeding (sequential job steps fail fast by default).

### D6: No SDK setup step

Unlike nmoneys (which needs `setup-dotnet` to build), the Bun Dockerfile is self-contained — the base image provides the runtime. The runner only needs `docker`, which is preinstalled. This makes the workflow one step shorter than nmoneys.

## Risks / Trade-offs

- [GHCR package is private by default → Render pull may 401] → Mitigation: configure registry credentials in Render, or make the GHCR package public. This is a Render-side setting, not a workflow concern.
- [`latest` tag is mutable — a failed build overwrites it] → Mitigation: `sha-<short-sha>` tags are immutable and always available for rollback; a failed build step exits non-zero and never reaches push.
- [No test gate before deploy — a broken image can deploy] → Mitigation: accepted for now (tests deferred per scope); the `sha-<short-sha>` tag enables instant rollback to a known-good image.
- [`GITHUB_TOKEN` write scope is limited to the owning repo] → Not a risk here (single-repo, same owner).

## Migration Plan

1. Add `RENDER_DEPLOY_HOOK` as a repository secret in GitHub.
2. Commit `.github/workflows/cd.yml`.
3. Push to `main` to trigger the first run.
4. Verify the image appears in GHCR and Render deploys.
5. If Render pull fails (401), configure registry credentials on Render or make the package public.

Rollback: delete the workflow file and remove the secret (see proposal.md rollback plan).
