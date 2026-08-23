import type { BootstrapState } from "@rome/api-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AUTH_QUERY_KEY, type AuthState } from "@/lib/auth-state";

// Renders a pre-auth page — LoginPage, OnboardPage — at a /dev route, in the
// bootstrap phase that page exists to serve.
//
// Those pages read the phase through `useAuthStateSnapshot`, a read-only view of
// the AUTH_QUERY_KEY cache that never fetches: the gate is the sole fetcher and
// has populated the cache by the time they mount under it. A /dev route sits
// outside the gate, so nothing populates that cache and the page renders its
// null-bootstrap branch — LoginPage drops the whole sign-in view. Seeding the
// cache is what makes the real page render.
//
// The seed goes into a QueryClient scoped to this subtree, never the app's.
// AuthGate reads the same key off the shared client, so a phase written there
// would outlive the preview and bounce the next dashboard navigation to /login.
export function BootstrapPreview({
  bootstrap,
  children,
}: {
  bootstrap: BootstrapState;
  children: ReactNode;
}) {
  const [client] = useState(() => {
    const scoped = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const seeded: AuthState = { ready: true, backendReachable: true, bootstrap };
    scoped.setQueryData(AUTH_QUERY_KEY, seeded);
    return scoped;
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
