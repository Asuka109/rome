// Fetch Gmail messages via Composio and convert each HTML body to Markdown.
//
// Run via:
//   composio run -f rome_apps/composio/scripts/gmail-parse-markdown.ts -- [flags]
//
// Flags (all optional):
//   --query "<gmail-query>"     Gmail search query (e.g. "is:unread newer_than:1d")
//   --max <N>                   max_results (default 10, max 500)
//   --page-token <token>        pagination cursor
//   --include-links             keep inline links in markdown (default: strip URLs, keep anchor text)
//   --raw                       include the original HTML/text body alongside markdown
//
// One-time setup before first use:
//   (cd rome_apps/composio/scripts && npm install)

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

declare const execute: (slug: string, data?: unknown) => Promise<{ data: any; error?: unknown }>;

type Args = {
  query?: string;
  max: number;
  pageToken?: string;
  includeLinks: boolean;
  raw: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { max: 10, includeLinks: false, raw: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--query") out.query = argv[++i];
    else if (a === "--max") out.max = Math.max(1, Math.min(500, Number(argv[++i]) || 10));
    else if (a === "--page-token") out.pageToken = argv[++i];
    else if (a === "--include-links") out.includeLinks = true;
    else if (a === "--raw") out.raw = true;
  }
  return out;
}

// Strip zero-width / invisible / format chars commonly used as filler in
// marketing emails to defeat preview snippets:
//   U+00AD   SOFT HYPHEN (invisible between letters)
//   U+034F   COMBINING GRAPHEME JOINER
//   U+061C   ARABIC LETTER MARK
//   U+180E   MONGOLIAN VOWEL SEPARATOR
//   U+200B–F ZWSP / ZWNJ / ZWJ / LRM / RLM
//   U+2028–F line/paragraph/bidi separators, narrow no-break space
//   U+205F–F medium math space, word joiner, invisible operators
//   U+3164   HANGUL FILLER
//   U+FEFF   BOM / zero-width no-break space
//   U+FFF9–B interlinear annotation anchors
const INVISIBLE_CHARS =
  /[\u00AD\u034F\u061C\u180E\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u206F\u3164\uFEFF\uFFF9-\uFFFB]/g;

// Unicode horizontal whitespace beyond ASCII space/tab. Includes NBSP (U+00A0),
// OGHAM SPACE MARK (U+1680), en/em/figure/etc. spaces (U+2000-U+200A),
// NARROW NO-BREAK SPACE (U+202F), MEDIUM MATH SPACE (U+205F), and IDEOGRAPHIC
// SPACE (U+3000). Normalized to a regular space, then collapsed.
const UNICODE_HORIZONTAL_WS = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

// Many email bodies are HTML fragments without <html>/<body> wrappers. Treat
// anything with a few real tags as HTML.
const HTML_TAG = /<[a-z][a-z0-9]*[\s/>]/gi;
function isHtml(t: string): boolean {
  if (!t) return false;
  let count = 0;
  HTML_TAG.lastIndex = 0;
  while (HTML_TAG.exec(t)) if (++count >= 3) return true;
  return false;
}

function buildTurndown(includeLinks: boolean): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  td.remove(["script", "style", "noscript", "iframe"]);
  // Override turndown's default image rule (which would emit `![]()`) — emails
  // are full of tracking pixels and brand logos that just waste tokens.
  td.addRule("strip-images", { filter: "img", replacement: () => "" });
  if (!includeLinks) {
    // Replace <a> with its text content; drops tracking URLs (~30%+ of newsletter tokens).
    td.addRule("strip-link-urls", {
      filter: "a",
      replacement: (content) => content,
    });
  }
  return td;
}

// Below this threshold, emails are typically transactional (receipts, alerts)
// where the legal disclaimer is often longer than the actual notification.
// Readability tends to latch onto the disclaimer, so skip it entirely.
const READABILITY_MIN_HTML_BYTES = 15000;

function postProcessMarkdown(md: string): string {
  return (
    md
      .replace(INVISIBLE_CHARS, "")
      .replace(UNICODE_HORIZONTAL_WS, " ")
      // Collapse runs of 2+ spaces to a single space — after stripping invisible
      // filler and normalizing NBSPs, runs of 50+ spaces are common. Emails
      // almost never rely on markdown's trailing-2-space hard break or 4-space
      // code blocks.
      .replace(/ {2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function htmlToMarkdown(html: string, td: TurndownService): string {
  const fullMd = td.turndown(html);
  if (html.length < READABILITY_MIN_HTML_BYTES) return postProcessMarkdown(fullMd);
  try {
    const dom = new JSDOM(html, { url: "https://mail.example/" });
    const article = new Readability(dom.window.document).parse();
    if (article && article.content) {
      const readMd = td.turndown(article.content);
      // Reject extractions that are tiny relative to the full body — that's
      // readability locking onto a footer/disclaimer instead of the article.
      if (readMd.length >= 1500 && readMd.length >= fullMd.length * 0.4) {
        return postProcessMarkdown(readMd);
      }
    }
  } catch {
    // fall through to fullMd
  }
  return postProcessMarkdown(fullMd);
}

function cleanPlainText(text: string, includeLinks: boolean): string {
  // Decode common HTML entities that survive when senders ship "plain text"
  // bodies that still contain HTML escapes (e.g. &zwnj;, &nbsp;, &amp;).
  let out = text
    .replace(/&zwnj;/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(INVISIBLE_CHARS, "");
  // Marketing emails embed dozens of long tracking URLs. When the caller asked
  // to drop links, strip bare URLs from plain text too (matches HTML behavior).
  if (!includeLinks) out = out.replace(/https?:\/\/\S+/g, "");
  return out
    .replace(UNICODE_HORIZONTAL_WS, " ")
    .replace(/ {2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toMarkdown(
  text: string,
  td: TurndownService,
  includeLinks: boolean,
): { markdown: string; format: "html" | "text" } {
  if (!text) return { markdown: "", format: "text" };
  if (isHtml(text)) return { markdown: htmlToMarkdown(text, td), format: "html" };
  return { markdown: cleanPlainText(text, includeLinks), format: "text" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const td = buildTurndown(args.includeLinks);

  const params: Record<string, unknown> = { max_results: args.max };
  if (args.query) params.query = args.query;
  if (args.pageToken) params.page_token = args.pageToken;

  const res = await execute("GMAIL_FETCH_EMAILS", params);
  const messages = res?.data?.messages ?? [];

  const parsed = messages.map((m: any) => {
    const { markdown, format } = toMarkdown(m.messageText ?? "", td, args.includeLinks);
    const out: Record<string, unknown> = {
      messageId: m.messageId,
      threadId: m.threadId,
      sender: m.sender,
      to: m.to,
      subject: m.subject,
      messageTimestamp: m.messageTimestamp,
      labelIds: m.labelIds,
      attachmentList: m.attachmentList,
      display_url: m.display_url,
      preview: m.preview,
      bodyFormat: format,
      markdown,
    };
    if (args.raw) out.messageText = m.messageText;
    return out;
  });

  const result = {
    messages: parsed,
    nextPageToken: res?.data?.nextPageToken,
    resultSizeEstimate: res?.data?.resultSizeEstimate,
    options: { includeLinks: args.includeLinks, query: args.query ?? null, max: args.max },
  };
  console.log(JSON.stringify(result, null, 2));
}

await main();
