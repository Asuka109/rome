import type { DaemonActionRequest } from "./actions.js";

function getDaemonBaseUrl(): string {
  const host = process.env.HEALTH_DAEMON_HOST ?? "127.0.0.1";
  const port = process.env.HEALTH_DAEMON_PORT ?? "9368";
  return `http://${host}:${port}`;
}

async function toParsedBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

export async function executeDaemonAction(request: DaemonActionRequest): Promise<{
  status: number;
  body: unknown;
}> {
  const response = await fetch(`${getDaemonBaseUrl()}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  return {
    status: response.status,
    body: await toParsedBody(response),
  };
}

export async function getDaemonStatus(): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${getDaemonBaseUrl()}/status`);
  return {
    status: response.status,
    body: await toParsedBody(response),
  };
}
