import { useTranslation } from "react-i18next";

const desktopClientUrl = "/desktop-vnc.html?resize=scale&path=desktop-proxy/websockify";

export function applyDesktopSafeAreaBottom(
  iframe: HTMLIFrameElement,
  safeAreaBottom: string,
): void {
  if (!safeAreaBottom) return;
  iframe.contentDocument?.documentElement?.style.setProperty(
    "--rome-safe-area-bottom",
    safeAreaBottom,
  );
}

export default function DesktopPage() {
  const { t } = useTranslation("common");
  return (
    <div className="h-[var(--rome-mobile-content-height)] bg-foreground md:h-dvh">
      <iframe
        title={t("desktop.iframeTitle")}
        src={desktopClientUrl}
        className="block h-full w-full border-0 bg-foreground"
        allow="clipboard-read; clipboard-write"
        onLoad={(event) => {
          const safeAreaBottom = getComputedStyle(document.documentElement)
            .getPropertyValue("--rome-safe-area-bottom")
            .trim();
          applyDesktopSafeAreaBottom(event.currentTarget, safeAreaBottom);
        }}
      />
    </div>
  );
}
