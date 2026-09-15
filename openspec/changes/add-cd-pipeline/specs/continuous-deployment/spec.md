## Purpose

Automates building, publishing, and deploying the container image on every push to `main` via a single GitHub Actions workflow, so the deployed image always matches a specific commit with no manual steps.

## ADDED Requirements

### Requirement: A CD workflow triggers on push to main

The system SHALL define a GitHub Actions workflow at `.github/workflows/cd.yml` that triggers on push to the `main` branch. The workflow SHALL run on `ubuntu-latest` and declare `permissions: contents: read, packages: write`.

#### Scenario: Push to main triggers the workflow

- **GIVEN** a commit is pushed to the `main` branch
- **WHEN** GitHub evaluates the workflow trigger
- **THEN** the workflow SHALL run

#### Scenario: Push to a feature branch does not trigger

- **GIVEN** a commit is pushed to a branch other than `main`
- **WHEN** GitHub evaluates the workflow trigger
- **THEN** the workflow SHALL NOT run

### Requirement: The image is built using the Dockerfile ARG default

The system SHALL build the image via `docker buildx build` without passing `--build-arg BUN_IMAGE_TAG`. The Dockerfile `ARG` default SHALL be the canonical base image tag; `.env` remains a local override only.

#### Scenario: CI builds with the Dockerfile default

- **GIVEN** the Dockerfile declares `ARG BUN_IMAGE_TAG=1.4.2-distroless`
- **WHEN** the workflow builds the image
- **THEN** the base image SHALL be `oven/bun:1.4.2-distroless` with no `--build-arg` passed

#### Scenario: Bumping the base image

- **GIVEN** the Dockerfile `ARG` default is updated to `1.5.0-distroless`
- **WHEN** the next push to `main` builds the image
- **THEN** the base image SHALL be `oven/bun:1.5.0-distroless`

### Requirement: The image is tagged and pushed to GHCR

The system SHALL authenticate to GHCR using `GITHUB_TOKEN` and push two tags: `ghcr.io/dgg/juice-journal:latest` and `ghcr.io/dgg/juice-journal:sha-<short-sha>`, where `<short-sha>` is the first 7 characters of the commit SHA.

#### Scenario: Two tags are published

- **GIVEN** a push to `main` with commit SHA `abc1234`
- **WHEN** the workflow completes the build and push step
- **THEN** GHCR SHALL contain `ghcr.io/dgg/juice-journal:latest` and `ghcr.io/dgg/juice-journal:sha-abc1234` pointing at the same image

#### Scenario: Rollback to a prior commit

- **GIVEN** GHCR contains `ghcr.io/dgg/juice-journal:sha-abc1234` from a previous run
- **WHEN** a later build fails or produces a broken image
- **THEN** the prior `sha-<short-sha>` tag SHALL remain available for rollback

### Requirement: Render deploy is triggered after image push

The system SHALL trigger a Render deploy by sending an HTTP request to the `RENDER_DEPLOY_HOOK` secret URL after the image is pushed. The deploy step SHALL only run if the push succeeds.

#### Scenario: Successful deploy trigger

- **GIVEN** the image has been pushed to GHCR and `RENDER_DEPLOY_HOOK` is set
- **WHEN** the deploy step runs
- **THEN** the workflow SHALL send a request to the hook URL

#### Scenario: Deploy does not run on failed push

- **GIVEN** the image push step failed
- **WHEN** the workflow evaluates the deploy step
- **THEN** the deploy step SHALL NOT run

### Requirement: GHCR logout runs on completion

The system SHALL log out from GHCR with `docker logout ghcr.io` on workflow completion regardless of success or failure.

#### Scenario: Logout after success

- **GIVEN** the workflow completed successfully
- **WHEN** the logout step runs
- **THEN** the Docker client SHALL be logged out of `ghcr.io`

#### Scenario: Logout after failure

- **GIVEN** an earlier step failed
- **WHEN** the workflow evaluates the logout step
- **THEN** the logout step SHALL still run (`if: always()`)

### Requirement: No tests or coverage steps

The workflow SHALL NOT include test execution or code coverage steps. Build, push, and deploy are the only operations.

#### Scenario: Workflow excludes testing

- **GIVEN** the workflow file is inspected
- **WHEN** the steps are enumerated
- **THEN** no step SHALL run `bun test` or upload coverage reports
