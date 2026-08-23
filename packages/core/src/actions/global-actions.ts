import type { Action } from "./types.js";
import { formatArtifactId } from "../apps/artifact-id.js";

/**
 * An action granted to every agent regardless of its `actions:` allow-list,
 * identified by the owning app plus the action name. The name alone is unique
 * in the registry (the loader rejects duplicates), but pinning the app makes
 * the grant explicit and lets boot validation reject a name that has drifted to
 * a different owner.
 */
export interface GlobalActionRef {
  appId: string;
  actionName: string;
}

/**
 * Actions every agent may call without naming them in its allow-list. Granting
 * one bypasses per-agent action scoping, so this list is core-owned policy: an
 * app cannot self-declare ubiquity by shipping an action.yaml. Keep it minimal.
 */
export const GLOBALLY_GRANTED_ACTIONS: readonly GlobalActionRef[] = [
  // Asking the guardian a question is not an app action: it is the
  // host-built-in `ask_question` tool (see core/mcp-facade.ts buildInteractiveTools),
  // available on interactive surfaces without a per-agent grant.
];

/** The action names to fold into every agent's effective allow-list. */
export function resolveGlobalActionNames(refs: readonly GlobalActionRef[]): string[] {
  return refs.map((ref) => formatArtifactId(ref.appId, ref.actionName));
}

/** Minimal registry surface the boot validation reads — name + owner lookup. */
interface GlobalActionLookup {
  get(name: string): Action | undefined;
  getMetadata(name: string): { ownerId: string } | undefined;
}

/**
 * Fail-closed boot check: every globally-granted ref must resolve to a
 * registered, agent-callable action owned by the declared app. A typo, a
 * removed action, or an owner mismatch aborts startup rather than silently
 * widening or dropping a grant that bypasses every agent's scoping.
 */
export function validateGlobalActions(
  registry: GlobalActionLookup,
  refs: readonly GlobalActionRef[],
): void {
  const problems: string[] = [];
  for (const { appId, actionName } of refs) {
    const artifactId = formatArtifactId(appId, actionName);
    const action = registry.get(artifactId);
    if (!action) {
      problems.push(`${appId}/${actionName}: no action named "${actionName}" is registered`);
      continue;
    }
    if (!action.inputSchema) {
      problems.push(`${appId}/${actionName}: action is not agent-callable (no inputSchema)`);
    }
    const ownerId = registry.getMetadata(artifactId)?.ownerId;
    if (ownerId !== appId) {
      problems.push(
        `${appId}/${actionName}: registered action is owned by "${ownerId ?? "unknown"}", not "${appId}"`,
      );
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `GLOBALLY_GRANTED_ACTIONS is misconfigured:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  }
}
