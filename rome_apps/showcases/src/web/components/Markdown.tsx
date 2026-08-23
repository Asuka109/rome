import VendoredMarkdown from "../vendor/rome-core/markdown.js";

// Thin adapter over the vendored rome-core Markdown so call sites can pass a
// `content` string. The actual rendering (react-markdown + remark-gfm + prose
// styling) matches the chat page. See web/vendor/VENDOR.md.
export function Markdown({
  content,
  className,
  compact,
}: {
  content: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <VendoredMarkdown className={className} compact={compact}>
      {content}
    </VendoredMarkdown>
  );
}
