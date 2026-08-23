import { Fragment, type ReactNode } from "react";

/**
 * Minimal, dependency-free markdown renderer for brief / scout content. Builds
 * React nodes (no dangerouslySetInnerHTML), supporting headers, bullets,
 * **bold**, *italic*, `code`, and [links](url). Anything else renders as text.
 */

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Match links, bold, italic, inline code in one pass.
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|((?<![\w])_([^_\n]+)_(?![\w]))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1]) {
      nodes.push(
        <a
          key={key}
          href={m[3]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {m[2]}
        </a>,
      );
    } else if (m[4]) {
      nodes.push(<strong key={key}>{m[5]}</strong>);
    } else if (m[6]) {
      nodes.push(<em key={key}>{m[7]}</em>);
    } else if (m[8]) {
      nodes.push(
        <code key={key} className="rounded-4 bg-muted px-1 py-0.5 text-[0.85em]">
          {m[9]}
        </code>,
      );
    } else if (m[10]) {
      nodes.push(<em key={key}>{m[11]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const items = [...list];
    blocks.push(
      <ul key={`ul-${key++}`} className="my-1 ml-4 list-disc space-y-1">
        {items.map((li, idx) => (
          <li key={idx}>{renderInline(li, `li-${key}-${idx}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls =
        level <= 1
          ? "mt-3 mb-1 text-base font-semibold"
          : level === 2
            ? "mt-3 mb-1 text-sm font-semibold"
            : "mt-2 mb-0.5 text-sm font-semibold text-muted-foreground";
      blocks.push(
        <p key={`h-${key++}`} className={cls}>
          {renderInline(h[2], `h-${key}`)}
        </p>,
      );
      continue;
    }
    blocks.push(
      <p key={`p-${key++}`} className="my-1 leading-relaxed">
        {renderInline(line, `p-${key}`)}
      </p>,
    );
  }
  flushList();

  return (
    <div className="text-sm">
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}
