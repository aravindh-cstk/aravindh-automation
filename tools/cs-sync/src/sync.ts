import * as core from "@actions/core";
import { buildEntryPayload } from "./payload.js";
import { parseDocContent, parseDocFile } from "./parser.js";
import { markdownToHtml } from "./transform.js";
import { processImagesInHtml } from "./assets.js";
import type { ContentstackClient } from "./contentstack.js";
import type { AppConfig } from "./config.js";
import {
  getDocChanges,
  readFileAtCommit,
  type DocChange,
} from "./diff.js";

export interface SyncResult {
  path: string;
  action: "created" | "updated" | "unpublished" | "skipped";
  url?: string;
  uid?: string;
  error?: string;
}

export async function runSync(
  config: AppConfig,
  client: ContentstackClient,
  beforeSha: string,
  afterSha: string,
): Promise<SyncResult[]> {
  const changes = getDocChanges(
    config.repoRoot,
    config.CS_DOCS_ROOT,
    beforeSha,
    afterSha,
  );

  const results: SyncResult[] = [];
  const CONCURRENCY = 5;

  for (let i = 0; i < changes.length; i += CONCURRENCY) {
    const batch = changes.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((change) => processChange(config, client, change, beforeSha)),
    );
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      const result: SyncResult =
        s.status === "fulfilled"
          ? s.value
          : {
              path: batch[j].relativePath,
              action: "skipped",
              error: s.reason instanceof Error ? s.reason.message : String(s.reason),
            };
      results.push(result);
      logResult(result);
    }
  }

  writeSummary(results);
  const failures = results.filter((r) => r.error);
  if (failures.length > 0) {
    throw new Error(`Sync failed for ${failures.length} file(s)`);
  }

  return results;
}

async function processChange(
  config: AppConfig,
  client: ContentstackClient,
  change: DocChange,
  beforeSha: string,
): Promise<SyncResult> {
  if (change.type === "deleted") {
    return unpublishDeleted(config, client, change, beforeSha);
  }

  const doc =
    change.type === "added" || change.type === "modified"
      ? parseDocFile(
          config.repoRoot,
          config.CS_DOCS_ROOT,
          change.relativePath,
        )
      : null;

  if (!doc) {
    return { path: change.relativePath, action: "skipped", error: "Could not parse doc" };
  }

  let html = markdownToHtml(doc.body);
  html = await processImagesInHtml(html, doc.filePath, client);

  const existing = await client.findEntryByUrl(doc.frontMatter.url);
  const payload = buildEntryPayload(
    doc.frontMatter,
    html,
    existing?.article_content,
  );

  if (existing) {
    const updated = await client.updateEntry(existing.uid, payload);
    return {
      path: change.relativePath,
      action: "updated",
      url: doc.frontMatter.url,
      uid: updated.uid,
    };
  }

  const created = await client.createEntry(payload);
  return {
    path: change.relativePath,
    action: "created",
    url: doc.frontMatter.url,
    uid: created.uid,
  };
}

async function unpublishDeleted(
  config: AppConfig,
  client: ContentstackClient,
  change: DocChange,
  beforeSha: string,
): Promise<SyncResult> {
  const content = readFileAtCommit(
    config.repoRoot,
    beforeSha,
    change.relativePath,
  );

  if (!content) {
    return {
      path: change.relativePath,
      action: "skipped",
      error: "Could not read deleted file at parent commit",
    };
  }

  const doc = parseDocContent(
    config.repoRoot,
    config.CS_DOCS_ROOT,
    change.relativePath,
    content,
  );

  const existing = await client.findEntryByUrl(doc.frontMatter.url);
  if (!existing) {
    return {
      path: change.relativePath,
      action: "skipped",
      url: doc.frontMatter.url,
      error: "No entry found for deleted doc URL",
    };
  }

  await client.unpublishEntry(existing.uid);
  return {
    path: change.relativePath,
    action: "unpublished",
    url: doc.frontMatter.url,
    uid: existing.uid,
  };
}

function logResult(result: SyncResult): void {
  const status = result.error ? "FAIL" : "OK";
  const detail = result.error ?? `${result.action} ${result.url ?? ""} ${result.uid ?? ""}`.trim();
  console.log(`[${status}] ${result.path}: ${detail}`);
}

function writeSummary(results: SyncResult[]): void {
  const lines = [
    "## Contentstack docs sync",
    "",
    "| File | Action | URL | UID |",
    "|------|--------|-----|-----|",
  ];

  for (const r of results) {
    lines.push(
      `| ${r.path} | ${r.error ? `ERROR: ${r.error}` : r.action} | ${r.url ?? ""} | ${r.uid ?? ""} |`,
    );
  }

  const summary = lines.join("\n");
  if (typeof core.summary?.addRaw === "function") {
    core.summary.addRaw(summary);
  } else {
    console.log(summary);
  }
}
