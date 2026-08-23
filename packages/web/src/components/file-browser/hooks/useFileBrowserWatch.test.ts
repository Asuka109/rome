// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFileBrowserWatch } from "./useFileBrowserWatch";

const testState = vi.hoisted(() => ({
  config: { apiBasePath: "/api/projects", logicalRootPath: "projects" },
  tree: { loadRoot: vi.fn().mockResolvedValue([]) },
  selection: {
    selectedPath: null as string | null,
    selectedFolderPath: "projects" as string | null,
  },
  file: {
    hasUnsavedEdits: vi.fn().mockReturnValue(false),
    loadFile: vi.fn().mockResolvedValue("loaded"),
    isSelfOriginatedWatchEvent: vi.fn().mockReturnValue(false),
  },
  watch: { clearDeletedSelection: vi.fn() },
}));

vi.mock("../store/context", () => ({
  useFileBrowserStoreApi: () => ({ getState: () => testState }),
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly withCredentials: boolean;
  readonly close = vi.fn();
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(
    readonly url: string,
    init?: EventSourceInit,
  ) {
    this.withCredentials = init?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, data: unknown): void {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe("useFileBrowserWatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    testState.selection.selectedPath = null;
    testState.selection.selectedFolderPath = "projects";
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("rebaselines the file tree when the watcher reports ready", async () => {
    const { unmount } = renderHook(() =>
      useFileBrowserWatch({ watchEventsUrl: "/api/projects/events?watch=projects" }),
    );
    const source = MockEventSource.instances[0];
    expect(source.url).toBe("/api/projects/events?watch=projects");
    expect(source.withCredentials).toBe(true);

    await act(async () => {
      source.emit("ready", { at: 1, logicalRoot: "projects" });
      await Promise.resolve();
    });

    expect(testState.tree.loadRoot).toHaveBeenCalledWith({ preserveExpandedChildren: true });
    unmount();
    expect(source.close).toHaveBeenCalledOnce();
  });

  it("batches validated change events into tree and selected-file refreshes", async () => {
    testState.selection.selectedPath = "projects/notes.md";
    renderHook(() =>
      useFileBrowserWatch({ watchEventsUrl: "/api/projects/events?watch=projects" }),
    );
    const source = MockEventSource.instances[0];

    act(() => {
      source.emit("change", {
        at: 2,
        kind: "change",
        logicalRoot: "projects",
        path: "projects/notes.md",
      });
    });
    expect(testState.tree.loadRoot).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(testState.tree.loadRoot).toHaveBeenCalledWith({ preserveExpandedChildren: true });
    expect(testState.file.loadFile).toHaveBeenCalledWith("projects/notes.md", {
      preserveDisplayedContent: true,
      preserveTreeSelection: true,
      syncUrl: false,
    });
  });
});
