import type { Server, IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import net from "node:net";
import { createLogger } from "./logger.js";

const log = createLogger("desktop-proxy");

const PREFIX = "/desktop-proxy";

function buildUpstreamUpgradeRequest(
  req: IncomingMessage,
  targetPath: string,
  upstreamHost: string,
): string {
  const lines: string[] = [];
  lines.push(`${req.method ?? "GET"} ${targetPath} HTTP/1.1`);
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (key.toLowerCase() === "host") {
      lines.push(`Host: ${upstreamHost}`);
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) lines.push(`${key}: ${v}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join("\r\n") + "\r\n\r\n";
}

export function attachDesktopProxy(httpServer: Server): { close(): void } {
  const port = Number(process.env.ROME_NOVNC_PORT ?? 6080);
  const host = "127.0.0.1";
  const upstreams = new Set<net.Socket>();

  httpServer.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const rawUrl = req.url ?? "/";
    if (!rawUrl.startsWith(`${PREFIX}/`) && rawUrl !== PREFIX) return;

    const targetPath = rawUrl === PREFIX ? "/" : rawUrl.slice(PREFIX.length);
    const upstreamHost = `${host}:${port}`;

    const upstream = net.connect(port, host, () => {
      upstream.write(buildUpstreamUpgradeRequest(req, targetPath, upstreamHost));
      if (head && head.length > 0) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });

    upstreams.add(upstream);

    const teardown = () => {
      upstreams.delete(upstream);
      upstream.destroy();
      if (!socket.destroyed) socket.destroy();
    };

    upstream.on("error", (err) => {
      log.warn("upstream websockify error", { error: err.message });
      if (!socket.destroyed) {
        socket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      }
      teardown();
    });
    upstream.on("close", teardown);
    socket.on("error", teardown);
    socket.on("close", teardown);
  });

  return {
    close() {
      for (const upstream of upstreams) upstream.destroy();
      upstreams.clear();
    },
  };
}

export async function proxyDesktopHttp(req: Request): Promise<Response> {
  const port = Number(process.env.ROME_NOVNC_PORT ?? 6080);
  const incoming = new URL(req.url);
  const targetPath = incoming.pathname.slice(PREFIX.length) || "/";
  const upstreamUrl = `http://127.0.0.1:${port}${targetPath}${incoming.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.set("host", `127.0.0.1:${port}`);

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const response = await fetch(upstreamUrl, init);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    log.warn("desktop http proxy failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Bad Gateway", { status: 502 });
  }
}
