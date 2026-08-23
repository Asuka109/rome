/**
 * Live proof of the Rome Cloud→Composio token bridge.
 *
 * Takes the GitHub OAuth token Rome already holds (the Rome Cloud-issued token,
 * the same one written to /run/rome/github-oauth-token), injects it into Composio
 * as a managed BEARER_TOKEN connection via `ComposioClient.ensureBearerConnection`,
 * then executes a GitHub tool through that connection — demonstrating that the
 * existing connector tool-execute path works against a Rome Cloud-linked account
 * with no separate Composio GitHub sign-in.
 *
 * Run inside the dev:all rome container (where the Composio CLI session + token
 * file live):
 *   docker exec -w /workspace/rome_apps/connector <rome-container> \
 *     pnpm --filter @rome/app-connector exec tsx scripts/bridge-prototype.mts [--token <gho_…>]
 *
 * The Composio project credential comes from the live CLI session
 * (~/.composio/user_data.json) — sign in via the dashboard first if absent.
 * The GitHub token comes from --token, else $ROME_GITHUB_TOKEN_FILE, else
 * /run/rome/github-oauth-token.
 */
import { readFile } from "node:fs/promises";
import { ComposioClient } from "../src/api/composio-client.js";
import { readSessionApiKey } from "../src/api/composio-login.js";
import { ROME_USER_ID } from "../src/shared.js";

const TOOLKIT = "github";
// Composio's "who am I" GitHub tool — a zero-arg authenticated read, the
// cheapest way to prove the bridged token actually authorizes upstream calls.
const PROBE_TOOL = "GITHUB_GET_THE_AUTHENTICATED_USER";

function tokenFilePath(): string {
  return process.env.ROME_GITHUB_TOKEN_FILE?.trim() || "/run/rome/github-oauth-token";
}

async function resolveGithubToken(): Promise<string> {
  const flagIndex = process.argv.indexOf("--token");
  if (flagIndex >= 0 && process.argv[flagIndex + 1]) {
    return process.argv[flagIndex + 1].trim();
  }
  const path = tokenFilePath();
  try {
    const token = (await readFile(path, "utf8")).trim();
    if (token) return token;
    throw new Error(`token file ${path} is empty`);
  } catch (err) {
    throw new Error(
      `no GitHub token: pass --token <gho_…>, or connect GitHub via Rome Cloud so ${path} exists (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }
}

async function main(): Promise<void> {
  const apiKey = await readSessionApiKey();
  if (!apiKey) {
    throw new Error(
      "Not signed in to Composio — run `composio login` (or sign in via the dashboard).",
    );
  }
  const token = await resolveGithubToken();
  const client = new ComposioClient({ apiKey });

  console.log(`[bridge] provisioning Composio ${TOOLKIT} connection from the held OAuth token…`);
  const { connectedAccountId } = await client.ensureBearerConnection(ROME_USER_ID, TOOLKIT, token);
  console.log(`[bridge] connected account: ${connectedAccountId}`);

  console.log(`[bridge] executing ${PROBE_TOOL} through the bridged connection…`);
  const result = await client.executeTool({
    userId: ROME_USER_ID,
    connectedAccountId,
    slug: PROBE_TOOL,
    args: {},
  });

  if (!result.ok) {
    throw new Error(`tool reported failure: ${result.error ?? "unknown"}`);
  }
  const login =
    (result.data as { login?: unknown; details?: { login?: unknown } })?.login ??
    (result.data as { details?: { login?: unknown } })?.details?.login ??
    "(login not in payload)";
  console.log(`[bridge] ✅ GitHub tool ran as: ${String(login)}`);
}

main().catch((err) => {
  console.error(`[bridge] ❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
