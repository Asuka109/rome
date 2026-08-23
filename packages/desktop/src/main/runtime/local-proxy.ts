import { createServer, request, type Server } from "http";
import { connect, type Socket } from "net";
import { createLogger } from "../logger";

const log = createLogger("runtime:proxy");

export interface LocalProxy {
  /** loopback URL Electron loads, e.g. http://127.0.0.1:54321 */
  url: string;
  close(): Promise<void>;
}

/**
 * Listen on a loopback port and forward every HTTP request and WebSocket
 * upgrade to a Unix domain socket published by Lima's portForward. Mac app →
 * Rome traffic stays inside Virtualization.framework's shared socket buffer
 * rather than crossing vmnet, so host-side TUN proxies (Clash, Loon, Surge,
 * full-tunnel VPNs) cannot intercept it.
 *
 * The port is required, and the caller gets it or an error — never a different
 * port. Two things key off the origin staying put: core writes it into every
 * loopback OAuth redirect_uri, and Chromium partitions the dashboard's
 * localStorage by origin, port included.
 *
 * Because the port is fixed and therefore predictable, requests must also be
 * addressed to it: the proxy answers only to its own `Host`, which is what
 * keeps a rebound hostname from reaching Rome.
 *
 * `close()` MUST tear down active connections — dashboard SSE / WebSocket
 * channels are explicitly long-lived. A plain `server.close()` would wait
 * forever for those sockets to drain on their own.
 */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
]);

function stripHopByHop(headers: NodeJS.Dict<string | string[]>): NodeJS.Dict<string | string[]> {
  const result: NodeJS.Dict<string | string[]> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (HOP_BY_HOP.has(name.toLowerCase())) continue;
    result[name] = value;
  }
  return result;
}

export async function startLocalProxy(socketPath: string, port: number): Promise<LocalProxy> {
  // The only Host this proxy answers to. A browser reaching a loopback service
  // through a rebound hostname sends that hostname here, so comparing against
  // the address we actually bound is what stops DNS rebinding. Session cookies
  // are SameSite=Lax, which already covers cross-site requests, and rebinding
  // is the case that gets past it by arriving without credentials.
  //
  // Everything legitimate addresses this exactly: the dashboard is loaded from
  // this origin, Electron's own requests inherit it, and Rome Cloud's OAuth
  // callback is a redirect to it.
  //
  // Assigned from the bound address rather than the requested port, so it can
  // never disagree with the URL handed to callers. The handlers below only read
  // it when a request arrives, which is always after listen resolves.
  let expectedHost = "";
  const isAddressedToProxy = (host: string | undefined): boolean =>
    expectedHost !== "" && host === expectedHost;

  // Track every live socket — both ordinary HTTP keep-alives (managed by
  // `server.connections`) and WebSocket / SSE upgrades (which Node releases
  // from the server's accounting once we hand them off). We need both
  // halves so `close()` can deterministically reach zero.
  const liveSockets = new Set<Socket>();
  const trackedUpstreams = new Set<Socket>();
  const trackPair = (downstream: Socket, upstream: Socket): void => {
    liveSockets.add(downstream);
    trackedUpstreams.add(upstream);
    const dropDownstream = (): void => {
      liveSockets.delete(downstream);
    };
    const dropUpstream = (): void => {
      trackedUpstreams.delete(upstream);
    };
    downstream.once("close", dropDownstream);
    upstream.once("close", dropUpstream);
  };

  const server: Server = createServer((clientReq, clientRes) => {
    if (!isAddressedToProxy(clientReq.headers.host)) {
      log.warn(`refusing request addressed to ${clientReq.headers.host ?? "<no host>"}`);
      clientRes.writeHead(403, { "content-type": "text/plain" });
      clientRes.end("Rome runtime proxy: unexpected Host.\n");
      return;
    }
    const upstream = request(
      {
        socketPath,
        method: clientReq.method,
        path: clientReq.url,
        headers: clientReq.headers,
      },
      (upstreamRes) => {
        clientRes.writeHead(upstreamRes.statusCode ?? 502, stripHopByHop(upstreamRes.headers));
        upstreamRes.pipe(clientRes);
      },
    );
    upstream.on("error", (err) => {
      log.error("upstream request failed", err);
      if (!clientRes.headersSent) clientRes.writeHead(502, { "content-type": "text/plain" });
      clientRes.end(`Rome runtime proxy error: ${err.message}`);
    });
    clientReq.pipe(upstream);
  });

  server.on("connection", (socket) => {
    liveSockets.add(socket);
    socket.once("close", () => liveSockets.delete(socket));
  });

  server.on("upgrade", (req, clientSocket: Socket, head) => {
    if (!isAddressedToProxy(req.headers.host)) {
      log.warn(`refusing upgrade addressed to ${req.headers.host ?? "<no host>"}`);
      clientSocket.destroy();
      return;
    }
    // WebSocket is not subject to the same-origin policy, so any page can open
    // one against this port — and the Host check cannot see that, because the
    // attacker's target IS this address. Nor does SameSite=Lax help: the
    // upstream WS endpoints are unauthenticated by design (Caddy routes
    // `/ws/*` past forward_auth, since forwarding Upgrade headers to the auth
    // probe hangs it), so there is no cookie to withhold. Origin is the only
    // thing that separates the dashboard from a hostile tab.
    //
    // Every legitimate client builds its URL from window.location, so its
    // Origin is exactly this proxy. A missing Origin means a non-browser
    // caller, which has no reason to come through the proxy.
    if (req.headers.origin !== `http://${expectedHost}`) {
      log.warn(`refusing upgrade from origin ${req.headers.origin ?? "<none>"}`);
      clientSocket.destroy();
      return;
    }
    const upstream = connect({ path: socketPath });

    upstream.on("connect", () => {
      const headerLines = [`${req.method} ${req.url} HTTP/1.1`];
      for (const [name, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const v of value) headerLines.push(`${name}: ${v}`);
        } else {
          headerLines.push(`${name}: ${value}`);
        }
      }
      upstream.write(headerLines.join("\r\n") + "\r\n\r\n");
      if (head.length > 0) upstream.write(head);
      clientSocket.pipe(upstream);
      upstream.pipe(clientSocket);
      trackPair(clientSocket, upstream);
    });

    const teardown = (): void => {
      clientSocket.destroy();
      upstream.destroy();
    };
    upstream.on("error", teardown);
    clientSocket.on("error", teardown);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException): void => {
      server.removeListener("listening", onListening);
      server.close();
      if (err.code === "EADDRINUSE") {
        // Deliberately fatal. A fallback port would be written into the runtime
        // env file, changing its hash and forcing a full container recreate on
        // every launch, and would let the dashboard origin move mid-session.
        reject(
          new Error(
            `Rome needs local port ${port}, but another program is using it. ` +
              "Quit that program and try again.",
          ),
        );
        return;
      }
      reject(err);
    };
    const onListening = (): void => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Local proxy failed to obtain a loopback port.");
  }

  const url = `http://127.0.0.1:${address.port}`;
  expectedHost = `127.0.0.1:${address.port}`;
  log.info(`local proxy listening on ${url} (→ ${socketPath})`);

  return {
    url,
    close: () =>
      new Promise((resolve) => {
        for (const socket of liveSockets) socket.destroy();
        for (const upstream of trackedUpstreams) upstream.destroy();
        liveSockets.clear();
        trackedUpstreams.clear();
        server.close(() => resolve());
      }),
  };
}
