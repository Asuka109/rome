import { Chrome, FolderKanban } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApps } from "@/hooks/use-apps";
import type { WidgetType } from "./use-free-cells";

interface WidgetPickerProps {
  onSelect: (type: WidgetType, targetId?: string) => void;
  children: React.ReactNode;
}

export function WidgetPicker({ onSelect, children }: WidgetPickerProps) {
  const { t } = useTranslation("common");
  const { apps: allApps } = useApps();
  const apps = useMemo(
    () => (allApps ?? []).filter((a) => a.hasFrontend && a.status === "active"),
    [allApps],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem data-coach="widget-browser" onSelect={() => onSelect("desktop")}>
          <Chrome className="text-subtle-foreground" />
          {t("chat.addDesktop")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("projects")}>
          <FolderKanban className="text-subtle-foreground" />
          {t("chat.addProjects")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {apps.length === 0 ? (
          <DropdownMenuItem disabled>{t("chat.noApps")}</DropdownMenuItem>
        ) : (
          apps.map((app) => (
            <DropdownMenuItem key={app.id} onSelect={() => onSelect("app", app.id)}>
              {app.iconUrl ? (
                <img src={app.iconUrl} alt="" className="size-4 rounded-4" />
              ) : (
                <span className="flex size-4 items-center justify-center rounded-4 bg-surface-muted text-badge text-muted-foreground">
                  {app.displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate">{app.displayName}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
