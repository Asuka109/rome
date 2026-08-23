import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { projectSyncLinks } from "../schema.js";
import type { DrizzleDb } from "../index.js";
import type { LinkExtra, SyncSourceId } from "../../sync/types.js";

/**
 * Functional access to `project_sync_links`. The table is a thin
 * binding registry: which project is linked to which source type, plus an
 * opaque per-source `extra` payload. The source's native store (for git, `.git`
 * + the remote) remains the source of truth for operational state.
 */

export interface ProjectSyncLink {
  projectPath: string;
  linkType: SyncSourceId;
  extra: LinkExtra;
}

export async function getProjectSyncLink(
  db: DrizzleDb,
  projectPath: string,
): Promise<ProjectSyncLink | null> {
  const [row] = await db
    .select()
    .from(projectSyncLinks)
    .where(eq(projectSyncLinks.projectPath, projectPath))
    .limit(1);
  if (!row) return null;
  return {
    projectPath: row.projectPath,
    linkType: row.projectLinkType,
    extra: (row.projectLinkExtra as LinkExtra) ?? {},
  };
}

export async function upsertProjectSyncLink(
  db: DrizzleDb,
  input: { projectPath: string; linkType: SyncSourceId; extra: LinkExtra },
): Promise<void> {
  const now = new Date();
  await db
    .insert(projectSyncLinks)
    .values({
      id: uuidv4(),
      projectPath: input.projectPath,
      projectLinkType: input.linkType,
      projectLinkExtra: input.extra,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: projectSyncLinks.projectPath,
      set: {
        projectLinkType: input.linkType,
        projectLinkExtra: input.extra,
        updatedAt: now,
      },
    });
}

export async function updateProjectSyncLinkExtra(
  db: DrizzleDb,
  projectPath: string,
  extra: LinkExtra,
): Promise<void> {
  await db
    .update(projectSyncLinks)
    .set({ projectLinkExtra: extra, updatedAt: new Date() })
    .where(eq(projectSyncLinks.projectPath, projectPath));
}

export async function deleteProjectSyncLink(db: DrizzleDb, projectPath: string): Promise<void> {
  await db.delete(projectSyncLinks).where(eq(projectSyncLinks.projectPath, projectPath));
}
