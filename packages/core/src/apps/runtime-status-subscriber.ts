import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RomeAppRuntimeStatus } from "@rome/api-types/apps";
import { deriveAppRuntimeStatus } from "@rome/api-types/apps-runtime";
import { getProfileAppsRuntimeStatusPath } from "../paths.js";
import type { AppCatalog } from "./catalog.js";
import type { AppView, CatalogEvent, ResolvedApp } from "./state.js";

export interface RomeAppRuntimeStatusEntry {
  status: RomeAppRuntimeStatus;
  error?: string;
}

export interface RomeAppRuntimeStatusFile {
  updatedAt: string;
  apps: Record<string, RomeAppRuntimeStatusEntry>;
}

export function deriveRuntimeStatusFromView(view: AppView | ResolvedApp): RomeAppRuntimeStatus {
  return deriveAppRuntimeStatus(view.state, view.enabled);
}

export function buildRuntimeStatusEntries(
  catalog: AppCatalog,
): Record<string, RomeAppRuntimeStatusEntry> {
  return Object.fromEntries(
    catalog.list().map((view) => {
      const entry: RomeAppRuntimeStatusEntry = {
        status: deriveRuntimeStatusFromView(view),
        ...(view.lastError ? { error: view.lastError.message } : {}),
      };
      return [view.appId, entry];
    }),
  );
}

export function createRuntimeStatusFailureTracker(catalog: AppCatalog) {
  const failuresByApp = new Map<string, Map<string, string>>();

  return {
    markFailed(source: string, appId: string, error: string): void {
      const appFailures = failuresByApp.get(appId) ?? new Map<string, string>();
      appFailures.set(source, error);
      failuresByApp.set(appId, appFailures);
    },

    clearSources(predicate: (source: string) => boolean): void {
      for (const [appId, appFailures] of failuresByApp) {
        for (const source of appFailures.keys()) {
          if (predicate(source)) appFailures.delete(source);
        }
        if (appFailures.size === 0) failuresByApp.delete(appId);
      }
    },

    entries(): Record<string, RomeAppRuntimeStatusEntry> {
      const entries = buildRuntimeStatusEntries(catalog);
      for (const [appId, appFailures] of failuresByApp) {
        const existing = entries[appId];
        if (!existing || existing.status === "disabled") continue;
        const error = mergeRuntimeErrors(existing.error, [...appFailures.values()]);
        entries[appId] = { status: "failed", ...(error ? { error } : {}) };
      }
      return entries;
    },
  };
}

function mergeRuntimeErrors(existing: string | undefined, errors: string[]): string | undefined {
  const unique = [...new Set([existing, ...errors].filter((error): error is string => !!error))];
  return unique.length > 0 ? unique.join("; ") : undefined;
}

export async function readAppRuntimeStatus(
  statusPath: string = getProfileAppsRuntimeStatusPath(),
): Promise<RomeAppRuntimeStatusFile | null> {
  try {
    const raw = await readFile(statusPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<RomeAppRuntimeStatusFile>;
    if (!parsed || typeof parsed !== "object" || !parsed.apps || typeof parsed.apps !== "object") {
      return null;
    }

    const apps = Object.fromEntries(
      Object.entries(parsed.apps).flatMap(([appId, value]) => {
        if (
          !value ||
          typeof value !== "object" ||
          !("status" in value) ||
          !isRuntimeStatus(value.status)
        ) {
          return [];
        }

        const error =
          typeof value.error === "string" && value.error.trim().length > 0
            ? value.error
            : undefined;
        return [[appId, { status: value.status, ...(error ? { error } : {}) }]];
      }),
    );

    return {
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt.length > 0
          ? parsed.updatedAt
          : new Date(0).toISOString(),
      apps,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function writeAppRuntimeStatus(
  apps: Record<string, RomeAppRuntimeStatusEntry>,
  statusPath: string = getProfileAppsRuntimeStatusPath(),
): Promise<void> {
  await mkdir(dirname(statusPath), { recursive: true });
  await writeFile(
    statusPath,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), apps }, null, 2)}\n`,
    "utf-8",
  );
}

function isRuntimeStatus(value: unknown): value is RomeAppRuntimeStatus {
  return value === "active" || value === "disabled" || value === "failed";
}

/**
 * Build a catalog subscriber that snapshots the runtime-status JSON every
 * time a CatalogEvent fires. The current view drives the snapshot — the
 * event itself is the wake signal, not the data source.
 */
export function createRuntimeStatusSubscriber(
  catalog: AppCatalog,
  options: { statusPath?: string; onError?: (error: Error) => void } = {},
) {
  const statusPath = options.statusPath ?? getProfileAppsRuntimeStatusPath();
  return async function runtimeStatusSubscriber(_event: CatalogEvent): Promise<void> {
    try {
      const entries = buildRuntimeStatusEntries(catalog);
      await writeAppRuntimeStatus(entries, statusPath);
    } catch (err) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };
}
