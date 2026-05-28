import fs from "node:fs";
import path from "node:path";
import type { ContentstackClient } from "./contentstack.js";

const IMG_SRC_RE = /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi;
const MD_IMAGE_RE = /!\[[^\]]*]\(([^)]+)\)/g;
const CS_CDN_RE = /images\.contentstack\.io\/v3\/assets\/[^/]+\/([^/]+)\//;

function isLocalAssetRef(ref: string): boolean {
  if (!ref || ref.startsWith("http://") || ref.startsWith("https://")) {
    return false;
  }
  if (ref.startsWith("data:") || ref.startsWith("#")) {
    return false;
  }
  return true;
}

function extractCsAssetUid(url: string): string | null {
  return url.match(CS_CDN_RE)?.[1] ?? null;
}

function resolveLocalPath(docDir: string, ref: string): string {
  const decoded = decodeURIComponent(ref.split("#")[0] ?? ref);
  return path.normalize(path.resolve(docDir, decoded));
}

export async function processImagesInHtml(
  html: string,
  docFilePath: string,
  client: ContentstackClient,
): Promise<string> {
  const docDir = path.dirname(docFilePath);
  let result = html;

  const uploads = new Map<string, { url: string; uid: string }>();

  async function ensureUploaded(ref: string): Promise<{ url: string; uid: string } | null> {
    if (!isLocalAssetRef(ref)) return null;
    const abs = resolveLocalPath(docDir, ref);
    if (!fs.existsSync(abs)) {
      console.warn(`Image not found, skipping upload: ${abs}`);
      return null;
    }
    const cached = uploads.get(abs);
    if (cached) return cached;

    const existing = await client.findAssetByFilename(path.basename(abs));
    if (existing) {
      uploads.set(abs, existing);
      return existing;
    }

    const uploaded = await client.uploadAsset(abs);
    uploads.set(abs, uploaded);
    return uploaded;
  }

  const mdRefs = [...html.matchAll(MD_IMAGE_RE)].map((m) => m[1]);
  for (const ref of mdRefs) {
    await ensureUploaded(ref);
  }

  const matches = [...result.matchAll(IMG_SRC_RE)];
  for (const match of matches) {
    const full = match[0];
    const before = match[1] ?? "";
    const src = match[2] ?? "";
    const after = match[3] ?? "";

    const uploaded = await ensureUploaded(src);
    if (uploaded) {
      result = result.replace(full, `<img${before} src="${uploaded.url}" asset_uid="${uploaded.uid}"${after}>`);
      continue;
    }

    const csUid = extractCsAssetUid(src);
    if (csUid && !full.includes("asset_uid=")) {
      result = result.replace(full, `<img${before} src="${src}" asset_uid="${csUid}"${after}>`);
    }
  }

  return result;
}

export function collectLocalImageRefs(markdown: string, docFilePath: string): string[] {
  const docDir = path.dirname(docFilePath);
  const refs: string[] = [];

  for (const match of markdown.matchAll(MD_IMAGE_RE)) {
    const ref = match[1];
    if (isLocalAssetRef(ref)) refs.push(resolveLocalPath(docDir, ref));
  }

  return refs;
}
