# Contentstack docs sync

Syncs Markdown under `docs/` to Contentstack `docs_article` entries when changes merge to `main`.

## What gets written

| Field | Source |
|-------|--------|
| `title` | `[{marker}] - {heading}` from YAML front matter |
| `url` | `url` from front matter |
| `article_content` | One `article_section` modular block: `heading` + HTML `content` |

## What is not written

- `md_content` — maintained by separate internal automation
- `breadcrumb`, `related_articles`, `next_and_prev_links`, `seo` — editors manage in the CMS

Entries are matched by `url` (no Contentstack UIDs in GitHub). Creates are saved as **drafts**; publishing stays manual in Contentstack.

## GitHub setup

**Secrets** (Settings → Secrets and variables → Actions):

| Name | Description |
|------|-------------|
| `CONTENTSTACK_API_KEY` | Stack API key |
| `CONTENTSTACK_MANAGEMENT_TOKEN` | Management token with entry CRUD + asset upload |

**Variables**:

| Name | Example |
|------|---------|
| `CONTENTSTACK_ENVIRONMENT` | `production` |

Used when a doc file is **deleted** from `main` to unpublish that entry from production (`en-us`).

## Local usage

```bash
cd tools/cs-sync
npm ci
cp .env.example .env
# Edit .env with your stack API key and management token (file is gitignored)

# Sync between two commits (same as CI)
npm run sync -- --before "$(git rev-parse HEAD~1)" --after "$(git rev-parse HEAD)"

# Lint changed docs vs main
npm run lint -- --base origin/main
```

Optional env overrides: `CS_REGION` (default `us`), `CS_CONTENT_TYPE` (default `docs_article`), `CS_DOCS_ROOT` (default `docs`).

## Workflows

- `.github/workflows/contentstack-sync.yml` — push to `main` when `docs/**/*.md` changes
- `.github/workflows/docs-lint.yml` — pull requests; validates front matter and internal links
