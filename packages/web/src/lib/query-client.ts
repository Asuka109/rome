import { QueryClient } from "@tanstack/react-query";

// One client for the whole dashboard. Defaults tuned for an operator console:
// data is fresh for `staleTime`, so rapid remounts/refocuses within that window
// reuse cache instead of hammering the backend; once stale, regaining window
// focus refetches (the resync point for changes made elsewhere). Mutations
// invalidate the relevant queryKey to pull server truth rather than
// hand-patching local state. Latency-sensitive screens that must always reflect
// server truth on revisit override this with a per-query `staleTime: 0` (see
// useApps).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
