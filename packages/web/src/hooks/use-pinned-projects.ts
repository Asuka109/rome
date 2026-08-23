import { useCallback, useEffect, useState } from "react";

export const PINNED_PROJECTS_STORAGE_KEY = "rome-recent-chats-pinned-projects";

const PINNED_PROJECTS_CHANGED_EVENT = "rome:pinned-projects-changed";

function readPinnedProjects(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PINNED_PROJECTS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value): value is string => typeof value === "string"));
    }
  } catch {
    // Treat malformed or unavailable storage as an empty pin set.
  }
  return new Set();
}

function writePinnedProjects(values: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PINNED_PROJECTS_STORAGE_KEY, JSON.stringify(Array.from(values)));
  window.dispatchEvent(new CustomEvent(PINNED_PROJECTS_CHANGED_EVENT));
}

export function usePinnedProjects() {
  const [pinnedProjectPaths, setPinnedProjectPaths] = useState<Set<string>>(readPinnedProjects);

  useEffect(() => {
    const refresh = () => setPinnedProjectPaths(readPinnedProjects());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PINNED_PROJECTS_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(PINNED_PROJECTS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PINNED_PROJECTS_CHANGED_EVENT, refresh);
    };
  }, []);

  const setProjectPinned = useCallback((projectPath: string, pinned: boolean) => {
    const normalized = projectPath.trim();
    if (!normalized) return;
    const next = readPinnedProjects();
    if (pinned) next.add(normalized);
    else next.delete(normalized);
    writePinnedProjects(next);
    setPinnedProjectPaths(next);
  }, []);

  const togglePinnedProject = useCallback(
    (projectPath: string) => setProjectPinned(projectPath, !pinnedProjectPaths.has(projectPath)),
    [pinnedProjectPaths, setProjectPinned],
  );

  return { pinnedProjectPaths, setProjectPinned, togglePinnedProject };
}
