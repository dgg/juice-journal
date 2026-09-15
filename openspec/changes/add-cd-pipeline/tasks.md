## 1. Workflow file

- [ ] 1.1 Create `.github/workflows/cd.yml` with `name: CD`, `on: push: branches: [main]`, `permissions: contents: read, packages: write`, single job `deploy` on `ubuntu-latest`
- [ ] 1.2 Add `checkout` step (`actions/checkout@v6`)
- [ ] 1.3 Add GHCR login step: `echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin`
- [ ] 1.4 Add build + push step: `docker buildx build --tag ghcr.io/dgg/juice-journal:latest --tag ghcr.io/dgg/juice-journal:sha-<short-sha> --push .` (no `--build-arg`; compute short SHA from `github.sha`)
- [ ] 1.5 Add Render deploy step: `curl "$RENDER_DEPLOY_HOOK"` using `env: RENDER_DEPLOY_HOOK: ${{ secrets.RENDER_DEPLOY_HOOK }}`
- [ ] 1.6 Add logout step: `docker logout ghcr.io` with `if: always()`

## 2. Secret setup (manual, outside code)

- [ ] 2.1 Add `RENDER_DEPLOY_HOOK` repository secret in GitHub settings (paste the Render deploy hook URL)

## 3. Validation

- [ ] 3.1 Verify workflow syntax with `actionlint` (if available) or visual review against nmoneys reference structure
- [ ] 3.2 Push to `main` and confirm the workflow run succeeds (checkout → login → build+push → deploy → logout)
- [ ] 3.3 Confirm `ghcr.io/dgg/juice-journal:latest` and `ghcr.io/dgg/juice-journal:sha-<short-sha>` appear in the GitHub Packages UI
- [ ] 3.4 Confirm Render triggers a deploy (check Render dashboard activity log)
- [ ] 3.5 If Render pull fails with 401, configure GHCR registry credentials in Render or make the package public
