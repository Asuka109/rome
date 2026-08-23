export interface StartupSurfaceOnboarding {
  kind: "onboarding";
}

export interface StartupSurfaceLocal {
  kind: "local";
  url: string;
}

export type StartupSurface = StartupSurfaceOnboarding | StartupSurfaceLocal;

// Enrollment belongs to the dashboard and its token is stored by core. The
// desktop surface therefore depends only on whether the local runtime is ready.
export function chooseStartupSurface(
  localDashboardUrl: string,
  localRuntimeReady: boolean,
): StartupSurface {
  if (localRuntimeReady) {
    return { kind: "local", url: localDashboardUrl };
  }
  return { kind: "onboarding" };
}

// Whether the "Web Dashboard" menu item should navigate rather than only raise
// the window. A provider's OAuth page takes over the whole window and this
// frameless shell carries no back affordance, so the menu item is the way home.
// Already on the dashboard it stays put, because reloading would discard an
// in-progress compose.
//
// Origins, not prefixes: `http://127.0.0.1:47823@evil.example/` carries the
// dashboard in its user-info and belongs to evil.example. Anything unparseable
// navigates — the escape hatch fails toward escaping.
export function shouldReturnToDashboard(currentUrl: string, localDashboardUrl: string): boolean {
  try {
    return new URL(currentUrl).origin !== new URL(localDashboardUrl).origin;
  } catch {
    return true;
  }
}

export function shouldAutoOpenLocalDashboard(
  currentUrl: string,
  onboardingUrl: string,
  localDashboardUrl: string,
): boolean {
  if (!currentUrl || currentUrl === "about:blank") {
    return true;
  }

  return currentUrl.startsWith(onboardingUrl) || currentUrl.startsWith(localDashboardUrl);
}
