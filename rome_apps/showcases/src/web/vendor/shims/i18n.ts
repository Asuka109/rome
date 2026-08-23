// Standalone shim for `react-i18next` / `i18next`, used only by the vendored
// rome-core trace components under ../rome-core. It provides the minimal
// `useTranslation` surface those components call (`const { t } = useTranslation("activity")`),
// backed by a frozen copy of rome-core's English `activity` namespace.
//
// Why this exists: the vendored components import from "react-i18next" and
// "i18next". The Showcases app is standalone and ships a single locale, so we
// resolve keys against the strings table below instead of pulling in the full
// i18next runtime. See ../VENDOR.md for the exact import-line seams.
//
// SOURCE of strings: rome-internal packages/web/src/i18n/locales/en/activity.json
// (the `trace` subtree). Re-copy that subtree here when re-syncing.

type Vars = Record<string, unknown>;

/** Loose stand-in for i18next's TFunction generic. The namespace type param is
 *  accepted for source compatibility with the vendored components and ignored. */
export type TFunction<_NS = string> = (key: string, vars?: Vars) => string;

// Source: rome-internal packages/web/src/i18n/locales/en/chat.json (the keys the
// vendored components read). Re-copy when those strings change.
const CHAT_STRINGS: Record<string, unknown> = {
  blocks: {
    thinking: "Thinking...",
    showMore: "Show more",
    showLess: "Show less",
    // Read by the vendored TraceJsonView (tool input/output renderer).
    emptyObject: "(empty object)",
    emptyList: "(empty list)",
  },
};

const ACTIVITY_STRINGS: Record<string, unknown> = {
  trace: {
    loading: "Loading trace...",
    retry: "Retry",
    failedWithReason: "Error: {{reason}}",
    stoppedByUser: "Stopped by user",
    thinking: "Thinking...",
    thoughtFor: "Thought for {{duration}}",
    summary: {
      appsUsedSingle: "Used {{count}} app",
      appsUsedMultiple: "Used {{count}} apps",
      stepsSingle: "{{count}} step",
      stepsMultiple: "{{count}} steps",
      joiner: " · ",
      stoppedSuffix: " · stopped",
      failedSuffix: " · error",
      liveAppsSingle: "{{count}} app",
      liveAppsMultiple: "{{count}} apps",
      liveStep: "step {{count}}",
      activity: {
        usingApp: "Using {{app}}",
        thinking: "Thinking…",
        responding: "Responding…",
      },
    },
    drawer: {
      title: "Trace",
      live: "Live",
      ariaLabel: "Agent trace",
      closeAriaLabel: "Close trace",
      loadFailedHttp: "Failed to load trace (HTTP {{status}})",
      notAvailable: "Trace not available yet",
      loadFailed: "Failed to load trace",
      loadFailedReason: "Failed to load trace: {{reason}}",
      dumpTitle: "Download raw trace JSON",
      dumpAriaLabel: "Download raw trace JSON",
    },
  },
};

const NAMESPACES: Record<string, Record<string, unknown>> = {
  activity: ACTIVITY_STRINGS,
  chat: CHAT_STRINGS,
};

function lookup(root: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object") return (node as Record<string, unknown>)[part];
    return undefined;
  }, root);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{{${name}}}`,
  );
}

export function useTranslation(namespace?: string): { t: TFunction } {
  const root = NAMESPACES[namespace ?? "activity"] ?? ACTIVITY_STRINGS;
  const t: TFunction = (key, vars) => {
    const value = lookup(root, key);
    return typeof value === "string" ? interpolate(value, vars) : key;
  };
  return { t };
}
