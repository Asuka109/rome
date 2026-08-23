import { useEffect, useState, type ReactNode } from "react";
import { Ban, FolderGit2 } from "lucide-react";
import {
  getSyncStatus,
  listSyncSources,
  presentSyncState,
  type SyncSourceInfo,
  type SyncStatus,
} from "@/lib/sync-api";
import { GithubIcon } from "@/components/brand-icons/github-icon";
import { Tile } from "@/components/ui/tile";
import { SourceIcon } from "./source-icon";

export type NewFolderLinkChoice = "none" | "git";

interface NewFolderSyncSectionProps {
  /** The create target's parent path (file-browser logical path, may be null). */
  parentPath: string | null;
  /** Reports the user's link choice upward (always "none" when an ancestor is
   * already synced). */
  onChoiceChange: (choice: NewFolderLinkChoice) => void;
}

interface SyncedAncestor {
  projectPath: string;
  status: SyncStatus;
}

/** Ancestor project paths of the create location, deepest first (excludes the
 * not-yet-created folder itself). For parent "projects/a/b" → ["a/b", "a"]. */
function ancestorProjectPaths(parentPath: string | null): string[] {
  const rel = (parentPath ?? "").replace(/^\/?projects\/?/, "").replace(/^\/+|\/+$/g, "");
  if (!rel) return [];
  const segs = rel.split("/");
  const out: string[] = [];
  for (let i = segs.length; i >= 1; i--) out.push(segs.slice(0, i).join("/"));
  return out;
}

/**
 * Rendered inside the "New folder" dialog (projects only). If the create
 * location already sits inside a synced folder tree, it shows that ancestor's
 * sync status (the new folder just belongs to it). Otherwise it offers a source
 * to link the folder being created — regardless of depth.
 */
export function NewFolderSyncSection({ parentPath, onChoiceChange }: NewFolderSyncSectionProps) {
  const [choice, setChoice] = useState<NewFolderLinkChoice>("none");
  const [sources, setSources] = useState<SyncSourceInfo[]>([]);
  const [ancestor, setAncestor] = useState<SyncedAncestor | null>(null);
  const [loading, setLoading] = useState(true);

  // Can't link when the new folder would live inside an already-synced tree.
  useEffect(() => {
    onChoiceChange(ancestor ? "none" : choice);
  }, [choice, ancestor, onChoiceChange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAncestor(null);
    (async () => {
      // Find the nearest already-synced ancestor (nested sync-under-sync is not
      // offered, so at most one matters).
      for (const path of ancestorProjectPaths(parentPath)) {
        const status = await getSyncStatus(path).catch(() => null);
        if (cancelled) return;
        if (status && status.state !== "unlinked") {
          setAncestor({ projectPath: path, status });
          setLoading(false);
          return;
        }
      }
      // No synced ancestor → offer to link. Load sources for availability.
      const list = await listSyncSources().catch(() => [] as SyncSourceInfo[]);
      if (cancelled) return;
      setSources(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [parentPath]);

  if (loading) {
    return <p className="text-aux text-subtle-foreground">Checking sync status…</p>;
  }

  if (ancestor) {
    return (
      <div className="rounded-12 border border-border bg-surface-muted/50 px-3 py-2 text-ui">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FolderGit2 className="size-4 shrink-0" aria-hidden />
          <span>
            Inside <span className="text-foreground">{ancestor.projectPath}</span>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-aux text-muted-foreground">
          <SourceIcon source={ancestor.status.sourceId} className="size-3.5 shrink-0" />
          <span className="truncate">{ancestor.status.remoteLabel}</span>
          <span>· {presentSyncState(ancestor.status.state).label}</span>
        </div>
      </div>
    );
  }

  const github = sources.find((s) => s.id === "git");
  const options: Array<{
    id: NewFolderLinkChoice;
    label: string;
    icon: ReactNode;
    hint?: string;
  }> = [
    { id: "none", label: "Don't connect", icon: <Ban className="size-4" /> },
    {
      id: "git",
      label: github?.label ?? "GitHub",
      icon: <GithubIcon className="size-4" />,
      hint: github && !github.available ? "Will ask to connect" : undefined,
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-aux text-muted-foreground">Connect to a source (optional)</p>
      <div className="space-y-1">
        {options.map((opt) => (
          <Tile
            key={opt.id}
            className="w-full"
            selected={choice === opt.id}
            icon={opt.icon}
            title={opt.label}
            description={opt.hint}
            onClick={() => setChoice(opt.id)}
          />
        ))}
        {/* Google Drive is on the roadmap — shown disabled so the surface is
            discoverable without implying it works yet. */}
        <Tile
          className="w-full opacity-50"
          disabled
          icon={<SourceIcon source="googledrive" className="size-4" />}
          title="Google Drive"
          description="Coming soon"
        />
      </div>
    </div>
  );
}
