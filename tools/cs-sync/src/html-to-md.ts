import TurndownService from "turndown";

const td = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
});

// <p class="note|tip|warning"> → > **Note:** ...
// Must run before the default paragraph rule.
td.addRule("callout", {
  filter: (node) => {
    if (node.nodeName !== "P") return false;
    const cls = (node as Element).getAttribute("class") ?? "";
    return ["note", "tip", "warning"].includes(cls);
  },
  replacement: (_content, node) => {
    const cls = (node as Element).getAttribute("class") ?? "";
    const kind = cls.charAt(0).toUpperCase() + cls.slice(1);
    // Strip the bold prefix that turndown already converted so we re-emit it cleanly.
    const inner = _content.replace(/^\*\*\w+:\*\*\s*/, "").trim();
    return `\n\n> **${kind}:** ${inner}\n\n`;
  },
});

export function htmlToMarkdown(html: string): string {
  return td.turndown(html).trim();
}
