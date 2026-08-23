import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { getCoreRoot } from "../paths.js";
import type { ArtifactKind, ArtifactRef } from "./state.js";

/**
 * Core (non-app) artifacts shipped inside `packages/core/`. Today this is
 * limited to agents under `packages/core/agents/`; actions / skills / hooks
 * are all app-owned. Loaders merge this list with app artifacts pulled from
 * the AppCatalog — the catalog does not own core artifacts.
 */
export async function listCoreArtifacts(
  coreRoot: string = getCoreRoot(),
): Promise<readonly ArtifactRef[]> {
  const out: ArtifactRef[] = [];
  out.push(...(await listCoreAgents(coreRoot)));
  return out;
}

export async function listCoreArtifactsByKind(
  kind: ArtifactKind,
  coreRoot: string = getCoreRoot(),
): Promise<readonly ArtifactRef[]> {
  if (kind === "agent") return listCoreAgents(coreRoot);
  return [];
}

async function listCoreAgents(coreRoot: string): Promise<ArtifactRef[]> {
  const dir = join(coreRoot, "agents");
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .filter((entry) => extname(entry.name) === ".yaml" || extname(entry.name) === ".yml")
    .map((entry) => ({
      formatVersion: 2 as const,
      kind: "agent" as const,
      publicName: entry.name.replace(/\.(yaml|yml)$/u, ""),
      aliases: [] as readonly string[],
      ownerType: "core" as const,
      ownerId: "core",
      absolutePath: join(dir, entry.name),
    }));
}
