import "./loadEnv.js";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findRepoRoot } from "./diff.js";
import { parseDocFile, resolveDocPaths } from "./parser.js";

const MD_LINK_RE = /\[([^\]]*)]\(([^)]+)\)/g;
const DOCS_URL_PREFIX = "/developers/";

function parseArgs(argv: string[]): { base: string } {
  let base = "origin/main";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base" && argv[i + 1]) base = argv[++i];
  }
  return { base };
}

function listChangedDocs(repoRoot: string, docsRoot: string, base: string): string[] {
  try {
    execSync(`git merge-base ${base} HEAD`, { cwd: repoRoot, stdio: "pipe" });
    const mergeBase = execSync(`git merge-base ${base} HEAD`, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    const out = execSync(`git diff --name-only ${mergeBase} HEAD -- ${docsRoot}`, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    return out ? out.split("\n").filter((p) => p.endsWith(".md")) : [];
  } catch {
    const out = execSync(`git ls-files '${docsRoot}/**/*.md'`, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    return out ? out.split("\n") : [];
  }
}

function resolveUrlToFile(
  repoRoot: string,
  docsRoot: string,
  url: string,
): string | null {
  if (!url.startsWith(DOCS_URL_PREFIX)) return null;
  const suffix = url.slice(DOCS_URL_PREFIX.length);
  return path.join(repoRoot, docsRoot, `${suffix}.md`);
}

function resolveLinkTarget(
  repoRoot: string,
  docsRoot: string,
  docRepoPath: string,
  href: string,
): string | null {
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
    return null;
  }
  if (href.startsWith("#")) return null;

  if (href.startsWith(DOCS_URL_PREFIX)) {
    return resolveUrlToFile(repoRoot, docsRoot, href.split("#")[0] ?? href);
  }

  const docDir = path.dirname(docRepoPath);
  const target = href.startsWith("/")
    ? path.join(repoRoot, href.replace(/^\//, ""))
    : path.resolve(repoRoot, docDir, href.split("#")[0] ?? href);

  if (!target.endsWith(".md")) {
    const withMd = `${target}.md`;
    if (fs.existsSync(withMd)) return withMd;
  }
  return target;
}

function lintDoc(
  repoRoot: string,
  docsRoot: string,
  repoRelativePath: string,
): string[] {
  const errors: string[] = [];

  try {
    const doc = parseDocFile(repoRoot, docsRoot, repoRelativePath);
    const { absolute } = resolveDocPaths(repoRoot, docsRoot, repoRelativePath);
    if (!fs.existsSync(absolute)) {
      errors.push(`${repoRelativePath}: file not found`);
      return errors;
    }

    const allDocs = new Set(
      execSync(`git ls-files '${docsRoot}/**/*.md'`, {
        cwd: repoRoot,
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter(Boolean),
    );

    const urlPaths = new Map<string, string>();
    for (const p of allDocs) {
      try {
        const d = parseDocFile(repoRoot, docsRoot, p);
        if (urlPaths.has(d.frontMatter.url)) {
          errors.push(
            `Duplicate url ${d.frontMatter.url} in ${urlPaths.get(d.frontMatter.url)} and ${p}`,
          );
        } else {
          urlPaths.set(d.frontMatter.url, p);
        }
      } catch {
        /* skip invalid docs in duplicate check */
      }
    }

    for (const match of doc.body.matchAll(MD_LINK_RE)) {
      const href = match[2]?.trim() ?? "";
      const target = resolveLinkTarget(repoRoot, docsRoot, repoRelativePath, href);
      if (target === null) continue;
      const repoRel = path.relative(repoRoot, target).replace(/\\/g, "/");
      if (!fs.existsSync(target) && !allDocs.has(repoRel)) {
        errors.push(`${repoRelativePath}: broken link \`${href}\` → ${repoRel}`);
      }
    }
  } catch (err) {
    if (err instanceof Error && "issues" in err) {
      errors.push(`${repoRelativePath}: ${err.message}`);
    } else {
      errors.push(
        `${repoRelativePath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return errors;
}

async function main(): Promise<void> {
  const { base } = parseArgs(process.argv.slice(2));
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(path.join(scriptDir, "../../.."));
  const docsRoot = process.env.CS_DOCS_ROOT ?? "docs";

  const files = listChangedDocs(repoRoot, docsRoot, base);
  if (files.length === 0) {
    console.log("No doc files to lint.");
    return;
  }

  const allErrors: string[] = [];
  for (const file of files) {
    allErrors.push(...lintDoc(repoRoot, docsRoot, file));
  }

  if (allErrors.length > 0) {
    console.error("Docs lint failed:\n");
    for (const e of allErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`Lint passed for ${files.length} file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
