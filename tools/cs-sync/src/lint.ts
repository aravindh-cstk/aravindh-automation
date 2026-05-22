import "./loadEnv.js";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { findRepoRoot } from "./diff.js";
import { parseDocFile, resolveDocPaths } from "./parser.js";

const MD_LINK_RE = /\[([^\]]*)]\(([^)]+)\)/g;
const DOCS_URL_PREFIX = "/developers/";

function formatZodErrors(file: string, err: z.ZodError): string[] {
  return err.issues.map((issue) => {
    const field = issue.path[0] as string | undefined;
    if (!field) return `${file}: Invalid frontmatter: ${issue.message}`;
    // required_error and min(1) messages already contain the full guidance
    if (
      issue.code === "invalid_type" ||
      (issue.code === "too_small" && issue.minimum === 1)
    ) {
      return `${file}: ${issue.message}`;
    }
    return `${file}: ${issue.message}`;
  });
}

function parseArgs(argv: string[]): { base: string } {
  let base = "origin/main";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base" && argv[i + 1]) base = argv[++i];
  }
  return { base };
}

function listChangedDocs(
  repoRoot: string,
  docsRoot: string,
  base: string,
): { mdFiles: string[]; nonMdFiles: string[] } {
  try {
    execSync(`git merge-base ${base} HEAD`, { cwd: repoRoot, stdio: "pipe" });
    const mergeBase = execSync(`git merge-base ${base} HEAD`, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    const out = execSync(
      `git diff --name-only --diff-filter=d ${mergeBase} HEAD -- ${docsRoot}`,
      { cwd: repoRoot, encoding: "utf8" },
    ).trim();
    const all = out ? out.split("\n").filter(Boolean) : [];
    return {
      mdFiles: all.filter((p) => p.endsWith(".md")),
      nonMdFiles: all.filter((p) => !p.endsWith(".md")),
    };
  } catch {
    const out = execSync(`git ls-files '${docsRoot}/**/*.md'`, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    return { mdFiles: out ? out.split("\n").filter(Boolean) : [], nonMdFiles: [] };
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
  // /docs/ paths reference the live Contentstack site, not files in this repo
  if (href.startsWith("/docs/")) return null;

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
    if (err instanceof z.ZodError) {
      errors.push(...formatZodErrors(repoRelativePath, err));
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

  const { mdFiles, nonMdFiles } = listChangedDocs(repoRoot, docsRoot, base);

  const allErrors: string[] = [];

  for (const file of nonMdFiles) {
    allErrors.push(
      `${file}: File is missing the .md extension — rename it to ${path.basename(file)}.md so it is picked up by the CMS sync`,
    );
  }

  if (mdFiles.length === 0 && nonMdFiles.length === 0) {
    console.log("No doc files to lint.");
    return;
  }

  for (const file of mdFiles) {
    allErrors.push(...lintDoc(repoRoot, docsRoot, file));
  }

  if (allErrors.length > 0) {
    console.error("Docs lint failed:\n");
    for (const e of allErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`Lint passed for ${mdFiles.length} file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
