import { useTranslation } from "react-i18next";
import { useFileBrowserStore } from "./store/context";
import { getParentPath } from "./store/utils";

export function DropOverlay({ rootLabel }: { rootLabel: string }) {
  const { t } = useTranslation("files");
  const isDragActive = useFileBrowserStore((s) => s.ui.isDragActive);
  const logicalRootPath = useFileBrowserStore((s) => s.config.logicalRootPath);
  const selectedFolderPath = useFileBrowserStore((s) => s.selection.selectedFolderPath);
  const selectedPath = useFileBrowserStore((s) => s.selection.selectedPath);

  if (!isDragActive) return null;

  const uploadTargetPath = selectedFolderPath ?? getParentPath(selectedPath, logicalRootPath);
  const uploadTargetLabel =
    uploadTargetPath === logicalRootPath ? rootLabel : `${uploadTargetPath}/`;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-info-bg/10 p-6">
      <div className="rounded-16 border-2 border-dashed border-info-border bg-surface/95 px-8 py-10 text-center shadow-25">
        <div className="text-section text-info-fg">{t("drop.title")}</div>
        <div className="mt-2 text-ui text-muted-foreground">
          {t("drop.target", { target: uploadTargetLabel })}
        </div>
        <div className="mt-1 text-aux text-subtle-foreground">{t("drop.tip")}</div>
      </div>
    </div>
  );
}
