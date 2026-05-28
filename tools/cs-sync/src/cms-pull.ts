import "./loadEnv.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { findRepoRoot } from "./diff.js";
import { ContentstackClient, type ContentstackEntry } from "./contentstack.js";
import { htmlToMarkdown } from "./html-to-md.js";

// URL prefix used in frontmatter — matches the /developers/ site path.
const DOCS_URL_PREFIX = "/developers/";

function parseArgs(argv: string[]): { lookbackMinutes: number } {
  let lookbackMinutes = 20;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--lookback" && argv[i + 1]) {
      lookbackMinutes = parseInt(argv[++i]!, 10);
    }
  }
  if (isNaN(lookbackMinutes) || lookbackMinutes < 1) {
    console.error("--lookback must be a positive integer (minutes)");
    process.exit(1);
  }
  return { lookbackMinutes };
}

/**
 * Maps a CMS entry URL (/developers/a/b/c) to its repo file path (docs/a/b/c.md).
 * Returns null if the URL does not belong to this docs root.
 */
function urlToFilePath(
  repoRoot: string,
  docsRoot: string,
  url: string,
): string | null {
  if (!url.startsWith(DOCS_URL_PREFIX)) return null;
  const suffix = url.slice(DOCS_URL_PREFIX.length);
  if (!suffix) return null;
  return path.join(repoRoot, docsRoot, `${suffix}.md`);
}

/**
 * Parses the CMS title format "[marker] - heading" back into its parts.
 * Falls back to using the raw title for both fields if the format is unexpected.
 */
function parseTitle(title: string): { marker: string; heading: string } {
  const match = title.match(/^\[(.+?)\]\s*-\s*(.+)$/);
  if (!match) {
    console.warn(
      `cms-pull: unexpected title format "${title}" — expected "[marker] - heading". ` +
      `Using full title as both marker and heading.`,
    );
    return { marker: title, heading: title };
  }
  return { marker: match[1]!, heading: match[2]! };
}

/**
 * Extracts the HTML content from the first article_section block of an entry.
 */
function extractHtml(entry: ContentstackEntry): string {
  const blocks = entry.article_content as
    | Array<{ article_section?: { content?: string } }>
    | undefined;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    console.warn(
      `cms-pull: entry uid=${entry.uid} url=${entry.url} has no article_content blocks — skipping body.`,
    );
    return "";
  }

  const content = blocks[0]?.article_section?.content;
  if (!content) {
    console.warn(
      `cms-pull: entry uid=${entry.uid} url=${entry.url} article_section.content is empty.`,
    );
  }
  return content ?? "";
}

/**
 * Rebuilds the full .md file (frontmatter + body) from a CMS entry.
 */
function buildMarkdownFile(entry: ContentstackEntry): string {
  const title = (entry.title as string | undefined) ?? "";
  const url = (entry.url as string | undefined) ?? "";
  const { marker, heading } = parseTitle(title);

  const html = extractHtml(entry);
  const body = html ? htmlToMarkdown(html) : "";

  // Wrap values in quotes to handle special characters (colons, brackets, etc.).
  const fm = [
    "---",
    `url: ${url}`,
    `marker: "${marker.replace(/"/g, '\\"')}"`,
    `heading: "${heading.replace(/"/g, '\\"')}"`,
    "---",
  ].join("\n");

  return `${fm}\n\n${body}\n`;
}

async function main(): Promise<void> {
  const { lookbackMinutes } = parseArgs(process.argv.slice(2));
  const since = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(path.join(scriptDir, "../../.."));
  const config = loadConfig(repoRoot);
  const client = new ContentstackClient(config);

  console.log(
    `cms-pull: fetching ${config.CS_CONTENT_TYPE} entries updated since ${since} ` +
    `(lookback: ${lookbackMinutes} min)`,
  );

  const entries = await client.listRecentEntries(since);

  if (entries.length === 0) {
    console.log("cms-pull: no recently updated entries found. Nothing to do.");
    return;
  }

  let changed = 0;
  let skipped = 0;

  for (const entry of entries) {
    const url = (entry.url as string | undefined) ?? "";

    if (!url) {
      console.warn(`cms-pull: entry uid=${entry.uid} has no url field — skipping.`);
      skipped++;
      continue;
    }

    const filePath = urlToFilePath(repoRoot, config.CS_DOCS_ROOT, url);
    if (!filePath) {
      console.log(
        `cms-pull: skipping uid=${entry.uid} url=${url} — ` +
        `URL does not start with "${DOCS_URL_PREFIX}" so it is not managed by this repo.`,
      );
      skipped++;
      continue;
    }

    const newContent = buildMarkdownFile(entry);
    const existing = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : null;

    if (existing === newContent) {
      console.log(`cms-pull: no change — ${url}`);
      continue;
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, newContent, "utf8");

    const action = existing === null ? "created" : "updated";
    console.log(`cms-pull: ${action} ${filePath} (uid=${entry.uid})`);
    changed++;
  }

  console.log(
    `cms-pull: done — ${changed} file(s) written, ${skipped} skipped out of ${entries.length} total.`,
  );
}

main().catch((err) => {
  console.error("cms-pull: fatal error —", err);
  process.exit(1);
});
