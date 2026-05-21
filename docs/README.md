# Developer documentation (GitHub source)

Markdown in this folder syncs to Contentstack `docs_article` entries when changes merge to `main`.

## Required front matter

Every `.md` file under `docs/` must start with:

```yaml
---
url: /developers/contentstack-delivery/dot-net-sdk/get-started-with-dotnet-delivery-sdk
marker: ".NET Delivery SDK"
heading: "Get Started with .NET Delivery SDK"
---
```

| Field | Description |
|-------|-------------|
| `url` | Canonical path (must start with `/developers/`). Used to find/create the CMS entry. |
| `marker` | Bracket prefix for the CMS **Title** field, e.g. `[.NET Delivery SDK] - …` |
| `heading` | Article section heading (no bracket prefix). |

## What syncs automatically

On push to `main`, GitHub Actions updates these entry fields only:

- `title` — `[{marker}] - {heading}`
- `url` — from front matter
- `article_content` — one `article_section` block with `heading` + HTML `content`

## What stays in Contentstack

Not written by the GitHub sync (editors or other automation):

- `md_content`
- `breadcrumb`, `related_articles`, `next_and_prev_links`, `seo`

## Images

Use relative paths next to the doc, e.g. `![](./images/screenshot.png)`. The sync uploads them to Contentstack Assets and rewrites URLs in HTML.

## Author workflow

1. Branch from `main`
2. Edit or add docs under `docs/`
3. Open a PR — lint workflow validates front matter and links
4. Merge to `main` — sync workflow creates/updates drafts in Contentstack
5. Review and publish in the Contentstack UI

- [SETUP-AFTER-SECRETS.md](./SETUP-AFTER-SECRETS.md) — what to do after GitHub secrets are configured
- [tools/cs-sync/README.md](../tools/cs-sync/README.md) — secrets and local commands
