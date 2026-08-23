import { execFile } from "node:child_process";
import { Hono } from "hono";

interface TailscaleStatusJson {
  Peer?: Record<
    string,
    {
      HostName: string;
      DNSName: string;
      TailscaleIPs: string[];
      OS: string;
      Online: boolean;
    }
  >;
}

export interface CapabilityManifest {
  name: string;
  capabilities?: {
    cdp_servers?: Array<{ name: string; port: number; status: string }>;
  };
}

/**
 * The host facts peer discovery reads. `GET /capability-discovery` touches the machine only
 * through this, so a caller can supply a source that does not depend on the local tailnet.
 */
export interface CapabilityDiscoverySource {
  /** Raw `tailscale status --json` stdout. Rejects when tailscale is absent or its daemon is down. */
  tailscaleStatus(): Promise<string>;
  /** The peer's capability manifest, or null when the peer answers non-OK. Rejects when unreachable. */
  peerManifest(ip: string): Promise<CapabilityManifest | null>;
}

const DISCOVERY_PORT = 9368;
const PROBE_TIMEOUT_MS = 3000;

function runTailscale(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("tailscale", args, { timeout: 10_000 }, (err, stdout) => {
      if (err) reject(new Error(err.message));
      else resolve(stdout);
    });
  });
}

export const hostCapabilityDiscoverySource: CapabilityDiscoverySource = {
  tailscaleStatus: () => runTailscale(["status", "--json"]),
  async peerManifest(ip: string) {
    const res = await fetch(`http://${ip}:${DISCOVERY_PORT}/`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as CapabilityManifest;
  },
};

export function capabilityDiscoveryRoutes(source: CapabilityDiscoverySource): Hono {
  const app = new Hono();

  app.get("/capability-discovery", async (c) => {
    try {
      const raw = await source.tailscaleStatus();
      const data = JSON.parse(raw) as TailscaleStatusJson;

      if (!data.Peer) {
        c.header("Cache-Control", "no-store");
        return c.json({ peers: [], desktopDetected: false, cdpRunning: false });
      }

      const onlinePeers = Object.values(data.Peer).filter((p) => p.Online && p.TailscaleIPs?.[0]);

      interface PeerResult {
        hostname: string;
        ip: string;
        name: string | null;
        capabilities: {
          cdp_servers: Array<{ name: string; port: number; status: string }>;
        } | null;
      }

      const results = await Promise.allSettled(
        onlinePeers.map(async (peer): Promise<PeerResult> => {
          const ip = peer.TailscaleIPs[0];
          const manifest = await source.peerManifest(ip);
          if (!manifest) {
            return { hostname: peer.HostName, ip, name: null, capabilities: null };
          }
          return {
            hostname: peer.HostName,
            ip,
            name: manifest.name ?? null,
            capabilities: manifest.capabilities?.cdp_servers
              ? { cdp_servers: manifest.capabilities.cdp_servers }
              : null,
          };
        }),
      );

      const peers: PeerResult[] = results
        .filter((r): r is PromiseFulfilledResult<PeerResult> => r.status === "fulfilled")
        .map((r) => r.value);

      const desktopDetected = peers.some((p) => p.name === "rome-desktop");
      const cdpRunning = peers.some(
        (p) =>
          p.name === "rome-desktop" &&
          p.capabilities?.cdp_servers?.some((s) => s.status === "running"),
      );

      c.header("Cache-Control", "no-store");
      return c.json({ peers, desktopDetected, cdpRunning });
    } catch {
      c.header("Cache-Control", "no-store");
      return c.json({ peers: [], desktopDetected: false, cdpRunning: false });
    }
  });

  app.post("/capability-discovery/open-page", async (c) => {
    const body = await c.req
      .json<{ ip?: string; cdpPort?: number; url?: string }>()
      .catch(() => ({}) as { ip?: string; cdpPort?: number; url?: string });
    const { ip, cdpPort, url } = body;

    if (!ip || typeof cdpPort !== "number" || !Number.isFinite(cdpPort) || cdpPort <= 0 || !url) {
      return c.json({ success: false, error: "Missing ip, cdpPort, or url" }, 400);
    }

    try {
      const endpoint = `http://${ip}:${cdpPort}/json/new?${encodeURIComponent(url)}`;
      let res = await fetch(endpoint, {
        method: "PUT",
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 405) {
        res = await fetch(endpoint, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
      }
      if (!res.ok) {
        return c.json({ success: false, error: `CDP returned ${res.status}` }, 502);
      }
      return c.json({ success: true });
    } catch {
      return c.json({ success: false, error: "Failed to open page via CDP" }, 500);
    }
  });

  return app;
}
