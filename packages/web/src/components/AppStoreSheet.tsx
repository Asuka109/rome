import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Sheet, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogBody } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { AppInstallConfirm } from "@/components/AppInstallConfirm";
import { APP_STORE_BROWSE_URL } from "@/lib/app-store-url";

/** Message the embedded store posts when the user picks "install on this Rome". */
interface InstallRequestMessage {
  type: "rome:install-request";
  listingId: string;
  version: string | null;
}

function isInstallRequest(value: unknown): value is InstallRequestMessage {
  if (typeof value !== "object" || value === null) return false;
  const msg = value as Record<string, unknown>;
  return msg.type === "rome:install-request" && typeof msg.listingId === "string";
}

export interface AppStoreSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful install so the caller can refresh its app list. */
  onInstalled: () => void;
  /** Full URL to embed. Defaults to the store browse root; quick entries pass a
   *  specific listing URL to land directly on an app. */
  src?: string;
}

/**
 * Right slide-in panel embedding the Rome App Store. The store runs in
 * `embed` mode and posts an install request back to us instead of navigating;
 * we surface a native confirm dialog and install via `/api/apps`.
 */
export function AppStoreSheet({ open, onClose, onInstalled, src }: AppStoreSheetProps) {
  const { t } = useTranslation("apps");
  const [pending, setPending] = useState<{ listingId: string; version: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    function onMessage(event: MessageEvent) {
      if (!isInstallRequest(event.data)) return;
      setPending({ listingId: event.data.listingId, version: event.data.version });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  // Drop any pending confirm when the whole panel closes.
  useEffect(() => {
    if (!open) setPending(null);
  }, [open]);

  const handleInstalled = useCallback(
    (name: string) => {
      toast.success(t("installed.installSuccess", { name }));
      setPending(null);
      onInstalled();
    },
    [onInstalled, t],
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} ariaLabel={t("header.appStore")}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <SheetTitle className="text-title text-foreground">{t("header.appStore")}</SheetTitle>
            <SheetDescription className="sr-only">{t("header.appStore")} panel</SheetDescription>
          </div>
          <IconButton
            size="sm"
            label={t("install.cancel")}
            onClick={onClose}
            icon={<X aria-hidden />}
          />
        </div>

        <iframe
          title={t("header.appStore")}
          src={src ?? APP_STORE_BROWSE_URL}
          className="min-h-0 w-full flex-1 border-0 bg-background"
        />
      </Sheet>

      {/* Sibling of the Sheet (not a child) so the two Radix dialogs don't fight
          over the focus trap — the confirm dialog takes focus while it's open. */}
      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        ariaLabel={t("install.title")}
        size="sm"
      >
        <DialogBody>
          {pending ? (
            <AppInstallConfirm
              listingId={pending.listingId}
              requestedVersion={pending.version}
              onInstalled={handleInstalled}
              onCancel={() => setPending(null)}
            />
          ) : null}
        </DialogBody>
      </Dialog>
    </>
  );
}
