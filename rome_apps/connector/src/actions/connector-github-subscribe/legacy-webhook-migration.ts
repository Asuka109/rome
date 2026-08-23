import { isNonRetryableUpdateFailure, unionGithubEvents } from "./github-webhook-helpers.js";

type GithubHookConfig = {
  url?: string;
};

export interface LegacyGithubHook {
  id: number;
  events?: string[];
  config?: GithubHookConfig;
}

export interface LegacyGithubHookClient {
  updateHook(hookId: number, input: LegacyGithubHookMutationInput): Promise<LegacyGithubHook>;
  createHook(input: LegacyGithubHookMutationInput): Promise<LegacyGithubHook>;
  deleteHook(hookId: number): Promise<void>;
}

export interface LegacyGithubHookMutationInput {
  active: true;
  events: string[];
  config: {
    url: string;
    content_type: "json";
    secret: string;
    insecure_ssl: "0";
  };
}

export interface LegacyWebhookMigrationInput {
  client: LegacyGithubHookClient;
  hooks: LegacyGithubHook[];
  legacyInstanceUrl: string | null;
  relayDepositUrl: string;
  requestedEvents: string[];
  secret: string;
}

export interface LegacyWebhookMigrationResult {
  hookId: number;
  events: string[];
  created: boolean;
  deletedDuplicates: number;
}

export function hasLegacyWebhook(input: {
  hooks: LegacyGithubHook[];
  legacyInstanceUrl: string | null;
}): boolean {
  return findLegacyHooks(input.hooks, input.legacyInstanceUrl).length > 0;
}

export async function migrateLegacyWebhook(
  input: LegacyWebhookMigrationInput,
): Promise<LegacyWebhookMigrationResult> {
  const legacyHooks = findLegacyHooks(input.hooks, input.legacyInstanceUrl);
  const relayHooks = input.hooks.filter((hook) => hook.config?.url === input.relayDepositUrl);
  const canonical = relayHooks[0] ?? legacyHooks[0];
  if (!canonical) {
    throw new Error("No legacy GitHub webhook found to migrate.");
  }

  const nextEvents = unionGithubEvents(canonical.events, input.requestedEvents);
  const mutation = legacyMutation(input, nextEvents);
  let hookId = canonical.id;
  let created = false;

  const canonicalIsLegacy = canonical.config?.url === input.legacyInstanceUrl;
  if (canonicalIsLegacy) {
    try {
      const updated = await input.client.updateHook(canonical.id, mutation);
      hookId = updated.id;
    } catch (err) {
      if (!isNonRetryableUpdateFailure(err)) throw err;
      await input.client.deleteHook(canonical.id);
      try {
        const replacement = await input.client.createHook(mutation);
        hookId = replacement.id;
        created = true;
      } catch (createErr) {
        const message = createErr instanceof Error ? createErr.message : String(createErr);
        throw new Error(
          `GitHub webhook migration deleted legacy hook ${canonical.id} but failed to create the relay hook: ${message}`,
        );
      }
    }
  } else {
    const updated = await input.client.updateHook(canonical.id, mutation);
    hookId = updated.id;
  }

  let deletedDuplicates = 0;
  for (const hook of [...relayHooks, ...legacyHooks]) {
    if (hook.id === canonical.id) continue;
    await input.client.deleteHook(hook.id);
    deletedDuplicates += 1;
  }

  return { hookId, events: nextEvents, created, deletedDuplicates };
}

function findLegacyHooks(
  hooks: LegacyGithubHook[],
  legacyInstanceUrl: string | null,
): LegacyGithubHook[] {
  if (!legacyInstanceUrl) return [];
  return hooks.filter((hook) => hook.config?.url === legacyInstanceUrl);
}

function legacyMutation(
  input: Pick<LegacyWebhookMigrationInput, "relayDepositUrl" | "secret">,
  events: string[],
): LegacyGithubHookMutationInput {
  return {
    active: true,
    events,
    config: {
      url: input.relayDepositUrl,
      content_type: "json",
      secret: input.secret,
      insecure_ssl: "0",
    },
  };
}
