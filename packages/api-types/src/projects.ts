export interface ProjectDashboardUsageDay {
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  date: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ProjectDashboardChat {
  createdAt: string;
  id: string;
  messageCount: number;
  searchText: string;
  snippet: string;
  title: string;
  updatedAt: string;
}

export interface ProjectDashboardStats {
  cacheHitRate: number;
  chatCount: number;
  monthBudgetUsd: number | null;
  monthCostUsd: number;
  monthTokens: number;
  totalCostUsd: number;
  totalTokens: number;
}

export interface ProjectDashboardChatPage {
  hasMore: boolean;
  limit: number;
  nextCursor: string | null;
  total: number;
}

export interface ProjectDashboardChatsResponse {
  chats: ProjectDashboardChat[];
  page: ProjectDashboardChatPage;
}

export interface ProjectDashboardResolveResponse {
  logicalPath: string;
  relativePath: string;
}

export interface ProjectDashboardResponse {
  availableProjectPaths: string[];
  chats: ProjectDashboardChat[];
  chatPage: ProjectDashboardChatPage;
  logicalPath: string;
  name: string;
  relativePath: string;
  stats: ProjectDashboardStats;
  usage: ProjectDashboardUsageDay[];
}
