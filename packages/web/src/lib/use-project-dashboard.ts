import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { ProjectDashboardResponse } from "@rome/api-types/projects";

const PROJECTS_ROOT = "projects";

function isSameOrChildPath(path: string, parentPath: string): boolean {
  return path === parentPath || path.startsWith(`${parentPath}/`);
}

function dashboardQueryKey(logicalPath: string) {
  return ["projects", "dashboard", logicalPath] as const;
}

async function fetchDashboard(
  logicalPath: string,
  signal: AbortSignal | undefined,
): Promise<ProjectDashboardResponse> {
  const response = await fetch(`/api/projects/dashboard?path=${encodeURIComponent(logicalPath)}`, {
    credentials: "include",
    signal,
  });
  if (response.status === 404) {
    throw new ProjectDashboardMissingError(logicalPath);
  }
  if (!response.ok) {
    throw new Error(`dashboard fetch failed: ${response.status}`);
  }
  return (await response.json()) as ProjectDashboardResponse;
}

export class ProjectDashboardMissingError extends Error {
  constructor(public readonly logicalPath: string) {
    super(`project dashboard missing for ${logicalPath}`);
    this.name = "ProjectDashboardMissingError";
  }
}

/**
 * Reduce the requested logical path to the nearest cached project root so we
 * don't refetch the dashboard when the user navigates between siblings inside
 * an already-loaded project. Returns the original path when no cached entry
 * covers it (e.g. first visit, or all-projects view).
 */
export function useResolvedProjectPath(requestedLogicalPath: string): string {
  const queryClient = useQueryClient();
  if (!requestedLogicalPath.startsWith(`${PROJECTS_ROOT}/`)) {
    return requestedLogicalPath;
  }

  const cache = queryClient.getQueriesData<ProjectDashboardResponse>({
    queryKey: ["projects", "dashboard"],
  });

  for (const [, data] of cache) {
    if (!data) continue;
    if (!isSameOrChildPath(requestedLogicalPath, data.logicalPath)) continue;
    const relativePath = requestedLogicalPath.slice(`${PROJECTS_ROOT}/`.length);
    const matchedRelative = data.availableProjectPaths.find((projectPath) =>
      isSameOrChildPath(relativePath, projectPath),
    );
    if (matchedRelative) {
      return `${PROJECTS_ROOT}/${matchedRelative}`;
    }
    return data.logicalPath;
  }
  return requestedLogicalPath;
}

export interface UseProjectDashboardResult {
  query: UseQueryResult<ProjectDashboardResponse>;
  resolvedPath: string;
  missing: boolean;
}

export function useProjectDashboard(logicalPath: string): UseProjectDashboardResult {
  const queryClient = useQueryClient();
  const resolvedPath = useResolvedProjectPath(logicalPath);
  const query = useQuery<ProjectDashboardResponse>({
    queryKey: dashboardQueryKey(resolvedPath),
    queryFn: async ({ signal }) => {
      const data = await fetchDashboard(resolvedPath, signal);
      // Mirror the response under its canonical key. Without this, the next
      // render's useResolvedProjectPath finds the cached entry, reduces the
      // requested path to data.logicalPath, and useQuery sees a new key with
      // no cache — kicking off a second fetch for the same dashboard.
      if (data.logicalPath !== resolvedPath) {
        queryClient.setQueryData(dashboardQueryKey(data.logicalPath), data);
      }
      return data;
    },
    retry: (count, error) => (error instanceof ProjectDashboardMissingError ? false : count < 1),
    staleTime: 30_000,
  });
  const missing = query.error instanceof ProjectDashboardMissingError;
  return { query, resolvedPath, missing };
}
