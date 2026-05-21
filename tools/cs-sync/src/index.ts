import "./loadEnv.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { findRepoRoot } from "./diff.js";
import { ContentstackClient } from "./contentstack.js";
import { runSync } from "./sync.js";

function parseArgs(argv: string[]): { before: string; after: string } {
  let before = "";
  let after = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--before" && argv[i + 1]) before = argv[++i];
    if (argv[i] === "--after" && argv[i + 1]) after = argv[++i];
  }
  if (!before || !after) {
    console.error("Usage: npm run sync -- --before <sha> --after <sha>");
    process.exit(1);
  }
  return { before, after };
}

async function main(): Promise<void> {
  const { before, after } = parseArgs(process.argv.slice(2));
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(path.join(scriptDir, "../../.."));
  const config = loadConfig(repoRoot);
  const client = new ContentstackClient(config);

  console.log(
    `Syncing ${config.CS_DOCS_ROOT}/**/*.md (${before.slice(0, 7)}..${after.slice(0, 7)}) → ${config.CS_CONTENT_TYPE}`,
  );

  await runSync(config, client, before, after);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
