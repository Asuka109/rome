// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AgentCatalogGroup, ChatSession } from "@/lib/chat-types";
import { setPresentationMode } from "@/lib/presentation-mode";
import { useSessionIdentity } from "./use-session-identity";

vi.mock("@/lib/chat-api", () => ({
  getSession: vi.fn(),
  listChatAgents: vi.fn(),
}));

import { getSession, listChatAgents } from "@/lib/chat-api";

const session: ChatSession = {
  id: "s1",
  name: "Planning the launch",
  personaId: null,
  projectName: "default",
  agentName: "replay",
  archivedAt: null,
  pinnedAt: null,
  createdAt: "2026-08-11T00:00:00.000Z",
  activityAt: "2026-08-11T00:00:00.000Z",
  lastSeenActivityAt: null,
  unread: false,
  messageCount: 2,
};

const groups: AgentCatalogGroup[] = [
  {
    ownerId: "replay",
    ownerType: "app",
    label: "Replay",
    description: "",
    iconUrl: "/api/apps/replay/icon",
    agents: [{ name: "replay", description: "" }],
  },
];

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("useSessionIdentity presentation mode", () => {
  it("masks the pinned-agent mention while presentation mode is on, and restores it when off", async () => {
    vi.mocked(getSession).mockResolvedValue(session);
    vi.mocked(listChatAgents).mockResolvedValue(groups);

    const { result } = renderHook(() => useSessionIdentity("s1"));
    await waitFor(() => expect(result.current.pinnedAgentMention?.appLabel).toBe("Replay"));
    expect(result.current.sessionName).toBe("Planning the launch");

    act(() => setPresentationMode(true));
    // The mask hides the agent identity only — the session name (the natural,
    // auto-generated title) must stay so headers still have a label.
    expect(result.current.pinnedAgentMention).toBeNull();
    expect(result.current.sessionName).toBe("Planning the launch");

    // Purely a rendering mask: toggling off restores the mention without a refetch.
    act(() => setPresentationMode(false));
    expect(result.current.pinnedAgentMention?.appLabel).toBe("Replay");
    expect(vi.mocked(getSession)).toHaveBeenCalledTimes(1);
  });

  it("resolves as masked when presentation mode was already on at mount", async () => {
    setPresentationMode(true);
    vi.mocked(getSession).mockResolvedValue(session);
    vi.mocked(listChatAgents).mockResolvedValue(groups);

    const { result } = renderHook(() => useSessionIdentity("s1"));
    await waitFor(() => expect(result.current.sessionName).toBe("Planning the launch"));
    expect(result.current.pinnedAgentMention).toBeNull();
  });
});
