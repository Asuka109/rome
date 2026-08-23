# @rome-os/rome-web-components

Shared content-level React components and contracts used by Rome and Rome Cloud.

## Purpose

Rome Web and Rome Cloud use different application shells and do not share one
complete design system. They do, however, render a small number of Rome-owned
content experiences whose behavior and data contract must remain identical on
both sides of the repository boundary. This package owns those cross-surface
experiences.

It is deliberately separate from `@rome-os/ui`:

- `@rome-os/ui` owns reusable design-system primitives for the Rome dashboard
  and Rome apps, such as buttons, fields, dialogs, and cards.
- `@rome-os/rome-web-components` owns semantic content renderers that are used
  by both Rome Web and Rome Cloud, while allowing each host to supply its own
  theme values and surrounding layout.

The package is configured for public publication so both repositories can
consume explicit released versions. It is an internal Rome building block, not
a general-purpose component library or a supported app-author API. After the
repository split, the open Rome repository remains its source of truth and Rome
Cloud consumes it as a package dependency.

## Modules

| Subpath | Responsibility |
| --- | --- |
| `@rome-os/rome-web-components/news-item` | The shared Rome News card renderer. |
| `@rome-os/rome-web-components/news-item/schema` | The versioned Rome News feed schema, types, validation, and locale resolution shared by its producer and consumers. |
| `@rome-os/rome-web-components/news-item/styles.css` | Styles required by the news card. |
| `@rome-os/rome-web-components/markdown` | **Deprecated** — re-exports `@rome-os/ui/markdown`. |
| `@rome-os/rome-web-components/styles.css` | Styles required by the shared renderers (the news card, plus a forward to `@rome-os/ui/markdown.css`). |

Prefer explicit subpaths when consuming one feature:

```tsx
import { NewsItemCard } from "@rome-os/rome-web-components/news-item";
import {
  RomeNewsFeedSchema,
  resolveRomeNewsDefinition,
} from "@rome-os/rome-web-components/news-item/schema";
```

### Markdown moved to the component kit

Markdown rendering now lives in `@rome-os/ui`, the published component kit, so
Rome apps — which cannot reach this package — can render prose too:

```tsx
import { Markdown } from "@rome-os/ui/markdown";
```

```css
@import "@rome-os/ui/markdown.css";
```

The `markdown` subpath here stays as a re-export so a consumer pinned to an
older version keeps compiling across the boundary. It will be removed once
Rome Cloud is on `@rome-os/ui/markdown`; migrate rather than pinning to it.

## Styles and theming

Import the shared styles once in the consuming application:

```css
@import "@rome-os/rome-web-components/styles.css";
```

The package supplies component structure, semantic class names, and rendering
behavior. Concrete theme values remain host-owned: the news card reads semantic
CSS variables such as `--foreground`, `--surface`, and `--border`, each with a
`--rome-news-*` escape hatch for a host on a different token vocabulary.

A host that needs only the news card should import
`@rome-os/rome-web-components/news-item/styles.css` instead — the aggregate
above still forwards to `@rome-os/ui/markdown.css` for the deprecated Markdown
subpath, and that is a large stylesheet to carry unused.

## Boundary

Code belongs here when it represents one Rome-owned content experience that is
rendered by both Rome Web and Rome Cloud. A feature may include its directly
coupled schema when producers and renderers must version that contract together.

The package must not become a second general UI kit. Generic controls belong in
`@rome-os/ui`; Rome Cloud-only pages and administration flows belong in Rome
Cloud; dashboard-only composition belongs in Rome Web. It must not import either
application or assume one application's router, database, authentication state,
or page layout.
