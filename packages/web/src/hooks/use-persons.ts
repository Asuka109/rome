import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Person } from "@/lib/chat-types";
import { fetchJson } from "@/lib/fetch-json";

const PERSONS_QUERY_KEY = ["persons"] as const;

// Shared /api/persons cache so ChatComposer and any future subscriber don't
// each fire their own mount-time fetch. Mutation paths (PeoplePage) should call
// useInvalidatePersons() after create/link/mark-stranger.
export function usePersons() {
  return useQuery<Person[]>({
    queryKey: PERSONS_QUERY_KEY,
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      fetchJson<Person[]>("/api/persons", { signal, fallback: "" }).catch(() => []),
  });
}

export function useInvalidatePersons() {
  const qc = useQueryClient();
  // Memoized so the reference is stable across renders. PeoplePage feeds this
  // into a useCallback(fetchData) → useEffect([fetchData]) chain; an unstable
  // reference makes that effect re-fire every render, which turns the page into
  // an unbounded /api/persons refetch loop.
  return useCallback(() => qc.invalidateQueries({ queryKey: PERSONS_QUERY_KEY }), [qc]);
}
