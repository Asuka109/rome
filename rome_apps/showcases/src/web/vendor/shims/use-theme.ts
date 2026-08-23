import { useEffect, useState } from "react";

// Standalone shim for rome-core's `@/hooks/use-theme`, used only by the vendored
// MermaidBlock (it needs `resolved: "light" | "dark"` to pick a diagram theme).
//
// Rome's shell toggles a `.dark` class on an ancestor of the app's Shadow DOM
// host, and the host theme tokens are inherited across the boundary. We detect
// the current mode by walking up from the shadow host to find a `.dark`
// ancestor, falling back to the OS preference, and re-check on DOM/attribute
// changes so the diagram re-themes live. See ../VENDOR.md.

export type ResolvedTheme = "light" | "dark";

function detectResolvedTheme(): ResolvedTheme {
  if (typeof document !== "undefined") {
    // Walk the light-DOM ancestor chain (shadow boundary is crossed via `host`).
    let node: Node | null = document.currentScript ?? null;
    // Start from any element and climb; simplest reliable check is the document.
    const hasDark = (el: Element | null): boolean => {
      let cur: Element | null = el;
      while (cur) {
        if (cur.classList && cur.classList.contains("dark")) return true;
        cur = cur.parentElement;
      }
      return false;
    };
    // Check both the documentElement chain and any element flagged `.dark`.
    if (document.querySelector(".dark") || hasDark(document.documentElement)) {
      return "dark";
    }
    void node;
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function useTheme(): { resolved: ResolvedTheme } {
  const [resolved, setResolved] = useState<ResolvedTheme>(() => detectResolvedTheme());

  useEffect(() => {
    const update = () => setResolved(detectResolvedTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", update);
    return () => {
      observer.disconnect();
      mq?.removeEventListener?.("change", update);
    };
  }, []);

  return { resolved };
}
