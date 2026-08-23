import { GitFork } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { InstalledAppCard } from "@rome/api-types/apps";
import { RomeInputDialog } from "@/components/rome-input-dialog";
import { useDashboardIdentity } from "@/hooks/use-dashboard-identity";

const REMIX_HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/;
const REMIX_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}[a-z0-9]$/;

function parseRemixName(value: string): { name: string; appId: string } | null {
  const name = value.trim();
  if (!name.startsWith("@")) return null;
  const slash = name.indexOf("/");
  if (slash < 0 || name.indexOf("/", slash + 1) >= 0) return null;
  const handle = name.slice(1, slash);
  const slug = name.slice(slash + 1);
  if (!REMIX_HANDLE_PATTERN.test(handle) || !REMIX_SLUG_PATTERN.test(slug)) return null;
  if (handle === slug || !/^[a-z]/.test(handle)) return null;
  const appId = `${handle}-${slug.replaceAll("_", "-")}`;
  if (appId.length > 64) return null;
  return { name, appId };
}

export function canRemixApp(app: InstalledAppCard): boolean {
  return app.origin === "appstore" && app.phase === "installed" && app.includeSource === true;
}

export function appRemixDraft(
  app: InstalledAppCard,
  target: { name: string; appId: string },
): string {
  const listing = app.source.mode === "appstore" ? app.source.listingId : app.id;
  const version = app.source.mode === "appstore" ? app.source.version : app.version;
  return [
    `Use the \`app_remix\` skill to remix the installed app \`${app.id}\` as \`${target.name}\` (\`${target.appId}\`).`,
    "",
    `Source: \`${listing}\` v${version}. Keep the source app unchanged.`,
    "",
    "I want to add: ",
  ].join("\n");
}

interface AppRemixDialogProps {
  app: InstalledAppCard | null;
  onClose: () => void;
}

export function AppRemixDialog({ app, onClose }: AppRemixDialogProps) {
  const { t } = useTranslation("apps");
  const navigate = useNavigate();
  const { data: identity } = useDashboardIdentity();
  const [error, setError] = useState<string | null>(null);
  const guardianHandle =
    identity?.kind === "guardian" && REMIX_HANDLE_PATTERN.test(identity.userId)
      ? identity.userId
      : null;

  useEffect(() => setError(null), [app]);

  const close = () => {
    setError(null);
    onClose();
  };

  const continueInChat = (value: string) => {
    if (!app) return;
    const target = parseRemixName(value);
    if (!target) {
      setError(t("installed.remixDialog.invalidName"));
      return;
    }
    close();
    navigate("/chat", {
      state: {
        draft: appRemixDraft(app, target),
        skill: "app_remix",
      },
    });
  };

  return (
    <RomeInputDialog
      open={app !== null}
      onCancel={close}
      onConfirm={continueInChat}
      title={t("installed.remixDialog.title", { name: app?.displayName ?? "" })}
      description={t("installed.remixDialog.description", {
        name: app?.displayName ?? "",
        version: app?.version ?? "",
      })}
      inputLabel={t("installed.remixDialog.nameLabel")}
      inputPlaceholder={app ? `@username/${app.id}` : undefined}
      initialValue={app && guardianHandle ? `@${guardianHandle}/${app.id}` : ""}
      confirmLabel={t("installed.remixDialog.confirm")}
      cancelLabel={t("installed.remixDialog.cancel")}
      error={error}
      icon={<GitFork className="h-4 w-4" aria-hidden />}
    />
  );
}
