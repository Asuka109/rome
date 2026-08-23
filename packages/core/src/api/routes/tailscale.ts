import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { settings } from "../../db/schema.js";
import { getInternalApiBaseUrl } from "../../internal-api-url.js";
import type { ApiDeps } from "../deps.js";

const DAEMON_SOCKET = "/var/run/tailscale/tailscaled.sock";
const TS_OPERATOR_USER = process.env.TS_OPERATOR_USER || process.env.USER || "rome";

const execFileAsync = promisify(execFile);

interface TailscalePrefsJson {
  AdvertiseRoutes?: string[] | null;
}

function isAdvertiseExitNodeEnabled(prefs: TailscalePrefsJson): boolean {
  const routes = prefs.AdvertiseRoutes ?? [];
  return routes.includes("0.0.0.0/0") && routes.includes("::/0");
}

function isDaemonMode(): boolean {
  return existsSync(DAEMON_SOCKET);
}

function runTailscale(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("tailscale", args, { timeout: 10_000 }, (err, stdout) => {
      if (err) reject(new Error(err.message));
      else resolve(stdout);
    });
  });
}

function runTailscaleSudo(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("sudo", ["tailscale", ...args], { timeout: 15_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

function spawnTailscaleUpAndGetAuthUrl(args: string[]): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const child = spawn("sudo", ["tailscale", ...args], {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    child.on("error", (err: Error) => reject(err));

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const raw = await runTailscale(["status", "--json"]);
        const data = JSON.parse(raw);
        if (data.AuthURL) {
          clearInterval(poll);
          resolve(data.AuthURL);
        } else if (data.BackendState === "Running") {
          clearInterval(poll);
          resolve(null);
        } else if (attempts >= 15) {
          clearInterval(poll);
          reject(new Error("Timed out waiting for auth URL"));
        }
      } catch {
        if (attempts >= 15) {
          clearInterval(poll);
          reject(new Error("Timed out waiting for auth URL"));
        }
      }
    }, 500);
  });
}

interface TailscaleStatusJson {
  BackendState?: string;
  CurrentTailnet?: { Name?: string | null };
  Self?: {
    HostName: string;
    DNSName: string;
    TailscaleIPs: string[];
    OS: string;
    Online: boolean;
    UserID?: number | null;
  };
  User?: Record<
    string,
    {
      ID?: number | null;
      LoginName?: string | null;
      DisplayName?: string | null;
      ProfilePicURL?: string | null;
    }
  >;
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
  CertDomains?: string[] | null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getConnectedAccount(data: TailscaleStatusJson) {
  const users = data.User ? Object.values(data.User) : [];
  const selfUserId = data.Self?.UserID ?? null;
  const matchedUser =
    (selfUserId !== null ? users.find((u) => u.ID === selfUserId) : null) ??
    (users.length === 1 ? users[0] : null);

  const loginName = readNonEmptyString(matchedUser?.LoginName);
  const displayName = readNonEmptyString(matchedUser?.DisplayName);
  const tailnetName = readNonEmptyString(data.CurrentTailnet?.Name);
  const profilePicUrl = readNonEmptyString(matchedUser?.ProfilePicURL);
  const label = loginName ?? displayName ?? tailnetName;

  if (!label) return null;
  return { label, loginName, displayName, tailnetName, profilePicUrl };
}

export function tailscaleRoutes(deps: ApiDeps): Hono {
  const app = new Hono();

  app.get("/tailscale/devices", async (c) => {
    if (isDaemonMode()) {
      const [advertiseRow] = await deps.db
        .select()
        .from(settings)
        .where(eq(settings.key, "tailscaleAdvertiseExitNode"))
        .limit(1);
      const advertiseExitNodePreference = advertiseRow?.value !== false;

      try {
        const statusRaw = await runTailscale(["status", "--json"]);
        const data: TailscaleStatusJson = JSON.parse(statusRaw);
        let advertiseExitNode = advertiseExitNodePreference;

        try {
          const prefsRaw = await runTailscale(["debug", "prefs"]);
          const prefs = JSON.parse(prefsRaw) as TailscalePrefsJson;
          advertiseExitNode = isAdvertiseExitNodeEnabled(prefs);
        } catch {}

        const backendState = data.BackendState ?? "Unknown";
        const status =
          backendState === "Running"
            ? "connected"
            : backendState === "Starting" || backendState === "NeedsMachineAuth"
              ? "authenticating"
              : "disconnected";

        const peers: Array<{
          hostname: string;
          fqdn: string;
          ip: string;
          os: string;
          online: boolean;
          isSelf: boolean;
        }> = [];

        if (data.Self) {
          peers.push({
            hostname: data.Self.HostName,
            fqdn: data.Self.DNSName.replace(/\.$/, ""),
            ip: data.Self.TailscaleIPs?.[0] ?? "",
            os: data.Self.OS,
            online: data.Self.Online,
            isSelf: true,
          });
        }

        if (data.Peer) {
          for (const peer of Object.values(data.Peer)) {
            peers.push({
              hostname: peer.HostName,
              fqdn: peer.DNSName.replace(/\.$/, ""),
              ip: peer.TailscaleIPs?.[0] ?? "",
              os: peer.OS,
              online: peer.Online,
              isSelf: false,
            });
          }
        }

        const account = status === "connected" ? getConnectedAccount(data) : null;

        return c.json({
          mode: "daemon" as const,
          status,
          account,
          ip: data.Self?.TailscaleIPs?.[0] ?? "",
          hostname: data.Self?.HostName ?? "",
          fqdn: data.Self?.DNSName?.replace(/\.$/, "") ?? "",
          advertiseExitNode,
          peers,
        });
      } catch {
        return c.json({
          mode: "daemon" as const,
          status: "disconnected",
          account: null,
          advertiseExitNode: advertiseExitNodePreference,
          peers: [],
        });
      }
    }

    const [row] = await deps.db
      .select()
      .from(settings)
      .where(eq(settings.key, "tailscale"))
      .limit(1);

    if (!row?.value) {
      return c.json({ mode: "oauth", configured: false, account: null, devices: [] });
    }

    const { clientId, clientSecret } = row.value as {
      clientId: string;
      clientSecret: string;
    };

    let accessToken: string;
    try {
      const tokenRes = await fetch("https://api.tailscale.com/api/v2/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
      });
      if (!tokenRes.ok) {
        return c.json({ error: "Stored credentials are no longer valid" }, 401);
      }
      const tokenData = (await tokenRes.json()) as { access_token: string };
      accessToken = tokenData.access_token;
    } catch {
      return c.json({ error: "Failed to connect to Tailscale API" }, 502);
    }

    try {
      const devicesRes = await fetch("https://api.tailscale.com/api/v2/tailnet/-/devices", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!devicesRes.ok) {
        return c.json({ error: "Failed to list devices" }, 502);
      }
      const devicesData = (await devicesRes.json()) as {
        devices?: Array<{
          id: string;
          hostname: string;
          name: string;
          os: string;
          addresses?: string[];
          clientVersion?: string;
          lastSeen: string;
        }>;
      };
      const now = Date.now();
      const devices = (devicesData.devices ?? []).map((d) => ({
        id: d.id,
        hostname: d.hostname,
        name: d.name,
        os: d.os,
        addresses: d.addresses ?? [],
        clientVersion: d.clientVersion ?? "",
        lastSeen: d.lastSeen,
        online: now - new Date(d.lastSeen).getTime() < 5 * 60 * 1000,
      }));
      return c.json({ mode: "oauth", configured: true, account: null, devices });
    } catch {
      return c.json({ error: "Failed to fetch devices from Tailscale API" }, 502);
    }
  });

  app.post("/tailscale/connect", async (c) => {
    if (isDaemonMode()) {
      const hostname = process.env.TS_HOSTNAME || "rome";
      const [exitNodePref] = await deps.db
        .select()
        .from(settings)
        .where(eq(settings.key, "tailscaleAdvertiseExitNode"))
        .limit(1);
      const args = ["up", `--hostname=${hostname}`, `--operator=${TS_OPERATOR_USER}`, "--reset"];
      if (exitNodePref?.value !== false) {
        args.push("--advertise-exit-node");
      }

      try {
        const authUrl = await spawnTailscaleUpAndGetAuthUrl(args);
        if (authUrl) {
          return c.json({ mode: "daemon", status: "authenticating", authUrl });
        }
        return c.json({ mode: "daemon", status: "connected" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start Tailscale";
        return c.json({ error: message }, 500);
      }
    }

    const body = await c.req
      .json<{ clientId?: string; clientSecret?: string }>()
      .catch(() => ({}) as { clientId?: string; clientSecret?: string });
    const { clientId, clientSecret } = body;
    if (!clientId || !clientSecret) {
      return c.json({ error: "clientId and clientSecret are required" }, 400);
    }

    let accessToken: string;
    try {
      const tokenRes = await fetch("https://api.tailscale.com/api/v2/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
      });
      if (!tokenRes.ok) {
        const err = (await tokenRes.json().catch(() => ({}))) as { message?: string };
        return c.json({ error: err.message || "Invalid Tailscale credentials" }, 400);
      }
      const tokenData = (await tokenRes.json()) as { access_token: string };
      accessToken = tokenData.access_token;
    } catch {
      return c.json({ error: "Failed to connect to Tailscale API" }, 502);
    }

    let deviceCount: number;
    try {
      const devicesRes = await fetch("https://api.tailscale.com/api/v2/tailnet/-/devices", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!devicesRes.ok) {
        return c.json(
          { error: "Credentials valid but unable to list devices. Check OAuth scopes." },
          400,
        );
      }
      const devicesData = (await devicesRes.json()) as { devices?: unknown[] };
      deviceCount = devicesData.devices?.length ?? 0;
    } catch {
      return c.json({ error: "Failed to fetch devices from Tailscale API" }, 502);
    }

    await deps.settingsRepo.set("tailscale", { clientId, clientSecret });
    return c.json({ mode: "oauth", success: true, deviceCount });
  });

  app.delete("/tailscale/connect", async (c) => {
    if (isDaemonMode()) {
      try {
        await runTailscaleSudo(["logout"]);
      } catch {}
      try {
        await runTailscaleSudo(["down"]);
      } catch {}
      return c.json({ mode: "daemon", status: "ok" });
    }
    await deps.db.delete(settings).where(eq(settings.key, "tailscale"));
    return c.json({ mode: "oauth", success: true });
  });

  app.put("/tailscale/exit-node", async (c) => {
    if (!isDaemonMode()) {
      return c.json({ error: "Exit node advertising is only available in daemon mode." }, 400);
    }

    const body = await c.req
      .json<{ enabled?: boolean }>()
      .catch(() => ({}) as { enabled?: boolean });
    if (typeof body.enabled !== "boolean") {
      return c.json({ error: "enabled must be a boolean" }, 400);
    }

    await deps.settingsRepo.set("tailscaleAdvertiseExitNode", body.enabled);

    const raw = await runTailscale(["status", "--json"]);
    const status = JSON.parse(raw) as TailscaleStatusJson;
    if (status.BackendState !== "Running") {
      c.status(202);
      return c.json({ ok: true, advertiseExitNode: body.enabled, pending: true });
    }

    await runTailscaleSudo([
      "set",
      body.enabled ? "--advertise-exit-node" : "--advertise-exit-node=false",
    ]);

    const prefsRaw = await runTailscale(["debug", "prefs"]);
    const prefs = JSON.parse(prefsRaw) as TailscalePrefsJson;
    return c.json({ ok: true, advertiseExitNode: isAdvertiseExitNodeEnabled(prefs) });
  });

  app.get("/tailnet", async (c) => {
    interface TailscaleInfo {
      tailnetDns: string | null;
      httpsEnabled: boolean | null;
      httpsError: string | null;
      certReady: boolean | null;
      certError: string | null;
    }

    const statusResult = await execFileAsync("tailscale", ["status", "--json"], {
      timeout: 5000,
    }).catch(() => null);

    const data = statusResult ? (JSON.parse(statusResult.stdout) as TailscaleStatusJson) : null;
    const tailnetDns = data?.Self?.DNSName?.replace(/\.$/, "") || null;
    const certDomains = Array.isArray(data?.CertDomains)
      ? data.CertDomains.filter((v): v is string => typeof v === "string")
      : [];

    const info: TailscaleInfo = {
      tailnetDns,
      httpsEnabled: null,
      httpsError: null,
      certReady: null,
      certError: null,
    };

    if (tailnetDns) {
      const sudo = isDaemonMode();
      const serveResult = await (sudo
        ? execFileAsync("sudo", ["tailscale", "serve", "status", "--json"], {
            timeout: 5000,
          })
        : execFileAsync("tailscale", ["serve", "status", "--json"], { timeout: 5000 })
      ).catch(() => null);

      if (serveResult) {
        try {
          const parsed = JSON.parse(serveResult.stdout) as { TCP?: Record<string, unknown> };
          info.httpsEnabled = !!parsed?.TCP?.["443"];
        } catch {
          info.httpsEnabled = false;
        }
      } else {
        info.httpsEnabled = false;
      }

      if (!info.httpsEnabled) {
        const serveTarget = getInternalApiBaseUrl();
        const enableResult = await (sudo
          ? execFileAsync("sudo", ["tailscale", "serve", "--bg", "--https=443", serveTarget], {
              timeout: 30_000,
            })
          : execFileAsync("tailscale", ["serve", "--bg", "--https=443", serveTarget], {
              timeout: 30_000,
            })
        ).catch((err) => {
          const message =
            err instanceof Error
              ? (err as Error & { stderr?: string }).stderr || err.message
              : String(err);
          if (message.includes("HTTPS certificates are not enabled")) {
            info.httpsError = "https_not_enabled";
          } else if (message.includes("certificate signed by unknown authority")) {
            info.httpsError = "ca_certificates_missing";
          } else {
            info.httpsError = message;
          }
          return null;
        });
        info.httpsEnabled = !!enableResult;
      }

      if (info.httpsEnabled === true) {
        if (!certDomains.includes(tailnetDns)) {
          info.certReady = false;
          info.certError = "domain_not_cert_eligible";
        } else {
          const tempDir = await mkdtemp(join(tmpdir(), "rome-tailscale-cert-"));
          const certFile = join(tempDir, "tls.crt");
          const keyFile = join(tempDir, "tls.key");
          try {
            if (sudo) {
              await execFileAsync(
                "sudo",
                [
                  "tailscale",
                  "cert",
                  "--cert-file",
                  certFile,
                  "--key-file",
                  keyFile,
                  "--min-validity",
                  "1h",
                  tailnetDns,
                ],
                { timeout: 10_000 },
              );
            } else {
              await execFileAsync(
                "tailscale",
                [
                  "cert",
                  "--cert-file",
                  certFile,
                  "--key-file",
                  keyFile,
                  "--min-validity",
                  "1h",
                  tailnetDns,
                ],
                { timeout: 10_000 },
              );
            }
            info.certReady = true;
          } catch (err) {
            const message =
              err instanceof Error
                ? (err as Error & { stderr?: string }).stderr || err.message
                : String(err);
            info.certReady = false;
            info.certError = message;
          } finally {
            await rm(tempDir, { recursive: true, force: true }).catch(() => {});
          }
        }
      }
    }

    c.header("Cache-Control", "no-store");
    return c.json(info);
  });

  return app;
}
