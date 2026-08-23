import { useTranslation } from "react-i18next";
import type { PendingUpload } from "@/lib/chat-types";

export interface PendingUploadsListProps {
  uploads: PendingUpload[];
  onRemove: (id: string) => void;
  disabled: boolean;
}

export function PendingUploadsList({ uploads, onRemove, disabled }: PendingUploadsListProps) {
  const { t } = useTranslation("chat");
  if (uploads.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {uploads.map((upload, index) => (
        <div
          key={upload.id}
          className="flex max-w-full items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-badge text-foreground"
        >
          <span className="shrink-0 text-muted-foreground">
            {t("composer.filePill", { index: index + 1 })}
          </span>
          <span className="max-w-[14rem] truncate">{upload.file.name}</span>
          <button
            type="button"
            className="rounded-full p-1 text-subtle-foreground hover:bg-border hover:text-foreground disabled:opacity-50"
            onClick={() => onRemove(upload.id)}
            disabled={disabled}
            aria-label={t("composer.removeFile", { name: upload.file.name })}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
