// VNC widget that also publishes its presence into the workspace-context registry.

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspaceContextRegistry } from "./workspace-context";

const DESKTOP_CLIENT_URL = "/desktop-vnc.html?resize=scale&path=desktop-proxy/websockify";
const DESKTOP_SLOT_ID = "desktop";

interface DesktopWidgetProps {
  dragging: boolean;
}

export function DesktopWidget({ dragging }: DesktopWidgetProps) {
  const { t } = useTranslation("common");
  const registry = useWorkspaceContextRegistry();

  useEffect(() => {
    if (!registry) return;
    registry.setBuiltin(DESKTOP_SLOT_ID, {
      kind: "desktop",
      line: "VNC session active",
    });
    return () => {
      registry.setBuiltin(DESKTOP_SLOT_ID, null);
    };
  }, [registry]);

  return (
    <div className="relative h-full w-full">
      <iframe
        title={t("nav.desktop")}
        src={DESKTOP_CLIENT_URL}
        className="block h-full w-full border-0 bg-foreground"
        allow="clipboard-read; clipboard-write"
      />
      {dragging && <div className="absolute inset-0 z-10" />}
    </div>
  );
}
