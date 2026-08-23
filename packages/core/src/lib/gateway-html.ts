// Pure HTML builder for the public-access gateway landing page.
// Shared by the runtime regenerator (`lib/gateway-page.ts`) and the
// container-boot script (`scripts/generate-caddyfile.ts`).

import { getFullAppHref } from "./app-routes.js";
import { escapeForInlineScript } from "./inline-script.js";
import type { PublicAccessConfig } from "./public-access-config.js";

interface GatewayHtmlConfig {
  publicRoutes: { label: string; path: string }[];
  instanceName: string;
  romeCloudSlug: string | null;
  romeCloudDomain: string | null;
}

export interface GatewayPageInput {
  publicAccessConfig: PublicAccessConfig;
  instanceName: string;
  romeCloudSlug: string | null;
  romeCloudDomain: string | null;
  /**
   * GA4 measurement ID. The gateway is a plain full-page load, so
   * the stock gtag snippet (default page_view) is emitted when set. Caddy
   * rewrites arbitrary private URLs to this page, so the reported URLs are raw
   * — the accepted exposure recorded.
   */
  gaMeasurementId?: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildGatewayHtml(input: GatewayPageInput): string {
  const publicAppIds = new Set(input.publicAccessConfig.allowedApps);
  const appIds = [
    ...input.publicAccessConfig.allowedApps,
    ...Object.keys(input.publicAccessConfig.cloudEmailAccess).filter(
      (appId) => !publicAppIds.has(appId),
    ),
  ];
  const config: GatewayHtmlConfig = {
    publicRoutes: appIds.map((appId) => ({
      label: appId,
      path: getFullAppHref(appId),
    })),
    instanceName: input.instanceName,
    romeCloudSlug: input.romeCloudSlug,
    romeCloudDomain: input.romeCloudDomain,
  };

  const gaMeasurementId = input.gaMeasurementId?.trim() || null;
  const gaSnippet = gaMeasurementId
    ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", ${escapeForInlineScript(gaMeasurementId)});
  </script>`
    : "";

  const routeListHtml =
    config.publicRoutes.length === 0
      ? '<li class="empty">No public apps available.</li>'
      : config.publicRoutes
          .map((r) => `<li><a href="${escapeHtml(r.path)}">${escapeHtml(r.label)}</a></li>`)
          .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(config.instanceName)}'s Rome</title>${gaSnippet}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #fafafa; --fg: #1a1a1a; --muted: #666;
      --border: #e0e0e0; --link: #2563eb; --link-hover: #1d4ed8;
      --card-bg: #fff; --notice-bg: #fef3c7; --notice-fg: #92400e;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a; --fg: #e5e5e5; --muted: #999;
        --border: #2a2a2a; --link: #60a5fa; --link-hover: #93bbfd;
        --card-bg: #141414; --notice-bg: #422006; --notice-fg: #fbbf24;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg); color: var(--fg);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 480px; width: 100%;
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 2rem;
    }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 1.5rem; }
    h2 { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.75rem; }
    .notice {
      background: var(--notice-bg); color: var(--notice-fg);
      padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    .notice code { font-weight: 600; }
    ul { list-style: none; margin-bottom: 1.5rem; }
    ul li { padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
    ul li:last-child { border-bottom: none; }
    ul li.empty { color: var(--muted); font-style: italic; }
    a { color: var(--link); text-decoration: none; }
    a:hover { color: var(--link-hover); text-decoration: underline; }
    .footer { font-size: 0.8rem; color: var(--muted); }
    .footer a { color: var(--muted); text-decoration: underline; }
    #redirecting {
      position: fixed; inset: 0; background: var(--bg);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; color: var(--muted); z-index: 100;
    }
  </style>
</head>
<body>
  <div id="redirecting" style="display:none">Redirecting to private network...</div>
  <div id="landing" class="container">
    <h1>${escapeHtml(config.instanceName)}'s Rome</h1>
    <div id="private-notice" class="notice" style="display:none">
      <code id="requested-path"></code> is a private route.
    </div>
    <h2>Public Apps</h2>
    <ul>
      ${routeListHtml}
    </ul>
    <p class="footer">To access the full dashboard, connect via <a href="https://tailscale.com/download">Tailscale</a>.</p>
  </div>
  <script>
    const config = ${escapeForInlineScript(config)};

    (async function() {
      var pathEl = document.getElementById("requested-path");
      var noticeEl = document.getElementById("private-notice");
      var requestedPathname = window.location.pathname;
      var requestedPath = requestedPathname + window.location.search + window.location.hash;

      if (requestedPathname !== "/" && pathEl && noticeEl) {
        pathEl.textContent = requestedPath;
        noticeEl.style.display = "block";
      }

      var tailnetDns = null;
      var certReady = false;
      try {
        var infoRes = await fetch("/api/tailnet", { cache: "no-store" });
        if (infoRes.ok) {
          var info = await infoRes.json();
          if (info && typeof info.tailnetDns === "string" && info.tailnetDns.length > 0) {
            tailnetDns = info.tailnetDns;
          }
          certReady = info && info.certReady === true;
        }
      } catch(e) {
        // Best-effort only
      }

      if (!tailnetDns || !certReady) return;

      function tryProto(proto, dns) {
        var c = new AbortController();
        var t = setTimeout(function() { c.abort(); }, 2000);
        return fetch(proto + "://" + dns + "/api/health", {
          signal: c.signal, mode: "cors",
        }).then(function(r) {
          clearTimeout(t);
          if (!r.ok) throw new Error("not ok");
          return proto;
        }).catch(function(e) {
          clearTimeout(t);
          throw e;
        });
      }

      try {
        var winner = await Promise.any([
          tryProto("https", tailnetDns),
          tryProto("http", tailnetDns),
        ]);
        document.getElementById("redirecting").style.display = "flex";
        document.getElementById("landing").style.display = "none";
        window.location.href = winner + "://" + tailnetDns + requestedPath;
        return;
      } catch(e) {
        // Neither protocol reachable
      }
    })();
  </script>
</body>
</html>`;
}
