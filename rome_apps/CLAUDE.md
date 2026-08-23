# `rome_apps/`

Each `rome_apps/<appId>/` is a runtime-loaded app (plugin), shipped first-party with Rome. They use the same app model as user-authored apps. The canonical authoring docs below are shared with the in-Rome `app_creation` skill, so the host coding agent and the in-Rome agent follow the same instructions.

## Playbook

- Before creating or scaffolding an app, read [`app_creation/SKILL.md`](coding/src/skills/app_creation/SKILL.md) — pick `$REPO`, `op: "create"`, `git init`, commit, then one-step `op: "install"` with `source: { mode: "source", path: $REPO }`.
- Before deciding *what* to build or *when* to ship, read [`app_creation/AUTHORING.md`](coding/src/skills/app_creation/AUTHORING.md) — the iteration loop, product-design rules, frontend and icon guidelines, the recurring-run pattern, boundaries, validation, and the delivery checklist.
- When you need a file-level API — `app.yaml`, `action.yaml`, agent yaml fields, the `@rome-os/app-runtime` and `@rome-os/app-web-sdk` surfaces, the on-disk layout, the `rome` CLI, storage and UI rules — read [`app_creation/REFERENCE.md`](coding/src/skills/app_creation/REFERENCE.md).
- After editing an installed app's skills or actions, repack and reinstall it. Hot-reload covers `packages/core` only.

## Traps

**Floating UI escapes the app's Shadow DOM and silently loses its styles.** The host (`packages/web` → `rome-app-host`) mounts each app's web bundle in a Shadow DOM and injects the app's compiled CSS into that shadow root, and CSS in a shadow root only styles nodes inside it. Anything built on a Radix `Portal` — dialog, popover, tooltip, dropdown-menu, select, toast, hover-card, context-menu — defaults to portaling into `document.body`, outside the shadow root. There it picks up only whatever utility classes the host dashboard happened to compile and drops the rest, so the layout looks subtly broken (collapsed spacing, wrong radii) while typecheck, unit tests, and `rome build` all pass. Only a browser catches it.

Every portal-based component passes the SDK-provided container:

```tsx
import { getPortalContainer } from "@rome-os/app-web-sdk";

<DialogPrimitive.Portal container={getPortalContainer()}>…</DialogPrimitive.Portal>
// same for PopoverPrimitive.Portal, TooltipPrimitive.Portal, SelectPrimitive.Portal, …
```

`getPortalContainer()` returns the app's shadow root, so the portal renders back inside the app's styles while still floating above everything. It returns `undefined` before mount (tests, SSR), where the library's `document.body` default is correct, so it is always safe to pass. Kit components (`@rome-os/ui`) resolve that container themselves, so importing one is already correct. The rule bites for app-authored floating UI, including a shadcn or Radix recipe copied into `components/ui/` because the kit does not publish that primitive. In dev the SDK warns (`[rome-app] A pop-up … rendered into document.body …`) when a floating layer escapes — treat that warning as a bug.
