import { useTranslation } from "react-i18next";
import { useFileBrowserStore, useFileBrowserStoreApi } from "./store/context";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

/**
 * sm-only [Overview | Files] segment for surfaces that expose a folder
 * dashboard. Reads `selectedFolderPath` to decide which segment is active and
 * `filesPaneDrillPath` to know which folder "Overview" should open. Tapping a
 * segment writes through the store; `Content` reacts by overlaying the
 * folderPanel, and `FilesPane` re-shows when the user taps back to Files.
 */
export function FolderPanelTabBar({ className }: { className?: string }) {
  const { t } = useTranslation("files");
  const store = useFileBrowserStoreApi();
  const selectedFolderPath = useFileBrowserStore((s) => s.selection.selectedFolderPath);
  const drillPath = useFileBrowserStore((s) => s.ui.filesPaneDrillPath);
  const logicalRootPath = useFileBrowserStore((s) => s.config.logicalRootPath);
  const overviewActive = Boolean(selectedFolderPath);

  return (
    <SegmentedControl
      aria-label={t("projects.tabOverview")}
      value={overviewActive ? "overview" : "files"}
      onValueChange={(value: string) => {
        const sel = store.getState().selection;
        if (value === "overview") {
          const target = drillPath ?? logicalRootPath;
          void sel.guardedSelectFolder(target);
        } else {
          void sel.guardedSelectFolder(null);
        }
      }}
      options={[
        { value: "overview", label: t("projects.tabOverview") },
        { value: "files", label: t("projects.tabFiles") },
      ]}
      className={cn("shrink-0 self-start @min-[1024px]/fb:hidden", className)}
    />
  );
}
