/**
 * Mirrors the structure Rome's app host builds (`prepareShadowMount` in
 * `packages/web`): a shadow root whose single top-level element is a <body>
 * carrying the theme classes, with the app's markup nested inside it. Tests
 * that exercise shadow-DOM behavior mount into `mountRoot`.
 */
export function mountShadowApp(): {
  shadowRoot: ShadowRoot;
  appBody: HTMLElement;
  mountRoot: HTMLElement;
  anchor: HTMLElement;
} {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const shadowRoot = host.attachShadow({ mode: "open" });
  const appBody = document.createElement("body");
  shadowRoot.appendChild(appBody);
  const mountRoot = document.createElement("div");
  appBody.appendChild(mountRoot);
  const anchor = document.createElement("button");
  mountRoot.appendChild(anchor);
  return { shadowRoot, appBody, mountRoot, anchor };
}
