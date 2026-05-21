# contentstack-docs-sync

Automates syncing developer documentation from GitHub (`docs/**/*.md`) to Contentstack `docs_article` entries.

## Quick start

1. Configure GitHub secrets and variables — see [tools/cs-sync/README.md](tools/cs-sync/README.md).
2. Author docs with required front matter — see [docs/README.md](docs/README.md).
3. Merge to `main` to trigger sync; use pull requests for lint validation.

## Layout

| Path | Purpose |
|------|---------|
| `docs/` | Markdown sources |
| `tools/cs-sync/` | Sync and lint CLI (Node 20 + TypeScript) |
| `.github/workflows/` | `contentstack-sync` and `docs-lint` |
| `fixtures/` | Example CMA entry payload shape |
| `demo-docs/` | Legacy demo content (optional) |
