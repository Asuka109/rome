import type {
  AgentMessage,
  AppLogger,
  TurnMiddlewareContext,
  TurnMiddlewareHookDeps,
} from "@rome-os/app-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHook } from "./index.js";

const logger: AppLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function makeContext(agentName: string, emitted: AgentMessage[]): TurnMiddlewareContext {
  return {
    input: { prompt: "hello" },
    session: { id: "session-1", agentName, channelThreadKey: "webchat:session-1" },
    emit: (event) => emitted.push(event),
    meta: {},
  };
}

describe("welcome-to-rome turn middleware routing", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("intercepts the app-owned canonical agent id", async () => {
    vi.useFakeTimers();
    const emitted: AgentMessage[] = [];
    const next = vi.fn(async () => {});
    const deps: TurnMiddlewareHookDeps = { appId: "welcome-to-rome", logger };
    const promise = createHook(deps).handle(
      makeContext("welcome-to-rome:welcome-to-rome", emitted),
      next,
    );

    await vi.runAllTimersAsync();
    await promise;

    expect(next).not.toHaveBeenCalled();
    expect(emitted.at(-1)).toMatchObject({ type: "result" });
  });

  it("does not intercept the same local name owned by another app", async () => {
    const emitted: AgentMessage[] = [];
    const next = vi.fn(async () => {});
    const deps: TurnMiddlewareHookDeps = { appId: "welcome-to-rome", logger };

    await createHook(deps).handle(makeContext("other-app:welcome-to-rome", emitted), next);

    expect(next).toHaveBeenCalledOnce();
    expect(emitted).toEqual([]);
  });
});
