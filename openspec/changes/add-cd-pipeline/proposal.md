## Why

The project has no CI/CD. Container images are built locally and deployed manually. On every push to `main` the latest image should be built, published to GitHub Container Registry (GHCR), and deployed to Render automatically — removing manual steps and guaranteeing the deployed image matches a specific commit.

## What Changes

- Add a GitHub Actions CD workflow (`.github/workflows/cd.yml`) triggered on push to `main`.
- Build the Docker image using `docker buildx build` with no `--build-arg BUN_IMAGE_TAG` — the Dockerfile `ARG` default applies (canonical source of truth for the base image tag).
- Push two tags to GHCR: `ghcr.io/dgg/juice-journal:latest` and `ghcr.io/dgg/juice-journal:sha-<short-sha>`.
- Trigger a Render deploy via a deploy hook secret (`RENDER_DEPLOY_HOOK`) after the image is pushed.
- Log out from GHCR on completion (`if: always()`).
- No tests or coverage steps in this workflow.
- No `docker/setup-buildx-action` — buildx ships preinstalled on `ubuntu-latest`.

## Capabilities

### New Capabilities

- `continuous-deployment`: automated build, publish to GHCR, and Render deploy on push to `main` via a single GitHub Actions workflow.

### Modified Capabilities

_None._ The existing `container-deployment` spec's `.env`-drives-local-override behavior is unchanged; the Dockerfile `ARG` default was always intended as the canonical/committed base image tag, and `.env` as the local override only.

## Impact

- **New files**: `.github/workflows/cd.yml`.
- **Secrets**: one new repository secret — `RENDER_DEPLOY_HOOK` (the Render deploy hook URL). `GITHUB_TOKEN` is auto-provided by Actions; no setup needed.
- **Dependencies**: none added. Uses only `docker buildx` (preinstalled on the runner) and `curl` (preinstalled).
- **Registry**: images pushed to GHCR under `ghcr.io/dgg/juice-journal`. Package is private by default; Render pull access is configured on the Render side (registry credentials or package made public).
- **No code changes**: no `Dockerfile`, `docker-compose.yaml`, or application source changes.

## Rollback Plan

1. Delete `.github/workflows/cd.yml` to stop automated builds and deploys.
2. Revert the commit that added the workflow.
3. Existing GHCR packages remain; delete the package via GitHub settings if full removal is needed.
4. Remove the `RENDER_DEPLOY_HOOK` repository secret.
5. Manual local builds via `docker compose` are unaffected and continue to work as before.
