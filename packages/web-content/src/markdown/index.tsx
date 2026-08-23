"use client";

/**
 * @deprecated Import from `@rome-os/ui/markdown` instead.
 *
 * The Markdown renderer moved into the published component kit so Rome apps —
 * which cannot reach this package — can render prose too. This subpath stays as
 * a re-export so consumers pinned to an older `@rome-os/rome-web-components`
 * keep compiling across the version boundary; it will be removed once Rome
 * Cloud is on `@rome-os/ui/markdown`.
 *
 * The stylesheet half is bridged the same way — `src/markdown/styles.css` now
 * forwards to `@rome-os/ui/markdown.css`.
 */
export * from "@rome-os/ui/markdown";
