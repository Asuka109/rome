// jsdom implements neither ResizeObserver nor scrollIntoView; cmdk's Command
// constructs the first on mount and calls the second whenever the roving
// selection moves. Every test rendering a `ui/command` surface needs both, so
// they are stubbed once here instead of in each file's beforeAll. Individual
// files may still override these. Node-environment tests are untouched.
if (typeof window !== "undefined") {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = () => {};
  }
}
