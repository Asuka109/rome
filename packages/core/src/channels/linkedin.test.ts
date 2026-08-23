import { describe, expect, it, vi } from "vitest";
import {
  LinkedInInboxPoller,
  pollDelayMs,
  threadNeedsSnapshot,
  type LinkedInPollerOptions,
} from "./linkedin.js";
import type { OpencliResult } from "./linkedin-cli.js";
import type {
  LinkedInMessageInput,
  LinkedInSyncSink,
  LinkedInThreadCursor,
  LinkedInThreadInput,
} from "./linkedin-sync.js";

function ok(payload: unknown): OpencliResult {
  return { code: 0, stdout: JSON.stringify(payload), stderr: "" };
}

function inboxRow(threadId: string, timestamp: string, preview = "hello") {
  return {
    thread_url: `https://www.linkedin.com/messaging/thread/${threadId}/`,
    thread_id: threadId,
    person_name: "Ada",
    last_message_preview: preview,
    unread: false,
    timestamp,
  };
}

function snapshotRow(threadId: string, messageId: string) {
  return {
    thread_id: threadId,
    conversation_name: "Ada",
    conversation_title: "",
    conversation_is_group: false,
    participant_count: 2,
    message_id: messageId,
    sent_at: "2026-08-19T20:00:00.000Z",
    sender_name: "Ada",
    sender_is_self: false,
    text: "hello",
  };
}

class FakeSink implements LinkedInSyncSink {
  threads: LinkedInThreadInput[] = [];
  messages: LinkedInMessageInput[] = [];
  synced: string[] = [];
  syncedMeta = new Map<string, { isGroup?: boolean | null; conversationTitle?: string | null }>();
  cursors = new Map<string, LinkedInThreadCursor>();

  async upsertThreads(threads: LinkedInThreadInput[]): Promise<void> {
    this.threads.push(...threads);
  }
  async upsertMessages(messages: LinkedInMessageInput[]): Promise<void> {
    this.messages.push(...messages);
  }
  async getThreadCursors(threadIds: string[]): Promise<Map<string, LinkedInThreadCursor>> {
    const out = new Map<string, LinkedInThreadCursor>();
    for (const id of threadIds) {
      const cursor = this.cursors.get(id);
      if (cursor) out.set(id, cursor);
    }
    return out;
  }
  async markThreadSynced(
    threadId: string,
    opts: { conversationTitle?: string | null; isGroup?: boolean | null },
  ): Promise<void> {
    this.synced.push(threadId);
    this.syncedMeta.set(threadId, opts);
  }
}

function makePoller(
  sink: FakeSink,
  run: LinkedInPollerOptions["run"],
  overrides: Partial<LinkedInPollerOptions> = {},
) {
  return new LinkedInInboxPoller({
    sink,
    run,
    minIntervalMs: 15 * 60_000,
    maxIntervalMs: 30 * 60_000,
    ...overrides,
  });
}

describe("pollDelayMs", () => {
  it("stays inside [min, max] across the random range", () => {
    expect(pollDelayMs(15, 30, () => 0)).toBe(15);
    expect(pollDelayMs(15, 30, () => 1)).toBe(30);
    expect(pollDelayMs(15, 30, () => 0.5)).toBeGreaterThanOrEqual(15);
    expect(pollDelayMs(15, 30, () => 0.5)).toBeLessThanOrEqual(30);
  });
});

describe("threadNeedsSnapshot", () => {
  const row = {
    rank: 1,
    threadId: "t1",
    threadUrl: "https://x/",
    personName: null,
    lastMessagePreview: "hello",
    unread: false,
    counterpartyType: null,
    category: null,
    lastMessageAt: new Date("2026-08-19T20:00:00Z"),
  };
  const cursor = {
    threadId: "t1",
    lastMessageAt: new Date("2026-08-19T20:00:00Z"),
    lastMessagePreview: "hello",
    lastSyncedAt: new Date("2026-08-19T20:01:00Z"),
  };

  it("is stale when never seen or never snapshotted", () => {
    expect(threadNeedsSnapshot(row, undefined)).toBe(true);
    expect(threadNeedsSnapshot(row, { ...cursor, lastSyncedAt: null })).toBe(true);
  });

  it("is fresh when the listing timestamp matches the watermark", () => {
    expect(threadNeedsSnapshot(row, cursor)).toBe(false);
  });

  it("is stale when the listing timestamp moved", () => {
    const moved = { ...row, lastMessageAt: new Date("2026-08-19T21:00:00Z") };
    expect(threadNeedsSnapshot(moved, cursor)).toBe(true);
  });

  it("falls back to the preview when the listing has no timestamp", () => {
    const noTs = { ...row, lastMessageAt: null };
    expect(threadNeedsSnapshot(noTs, cursor)).toBe(false);
    expect(threadNeedsSnapshot({ ...noTs, lastMessagePreview: "new msg" }, cursor)).toBe(true);
  });
});

describe("LinkedInInboxPoller.pollOnce", () => {
  it("snapshots a new thread and records its messages", async () => {
    const sink = new FakeSink();
    const run = vi.fn(async (args: string[]) => {
      if (args[1] === "inbox") return ok([inboxRow("t1", "2026-08-19T20:00:00.000Z")]);
      return ok([snapshotRow("t1", "m1"), snapshotRow("t1", "m2")]);
    });
    const poller = makePoller(sink, run);

    await poller.pollOnce();

    expect(sink.threads.map((t) => t.threadId)).toEqual(["t1"]);
    expect(sink.messages.map((m) => m.messageId)).toEqual(["m1", "m2"]);
    expect(sink.synced).toEqual(["t1"]);
    // The snapshot's group verdict reaches the watermark write: a 1:1 thread
    // records isGroup false, and its display-ladder conversation_name (the
    // counterparty's name) never lands as a title.
    expect(sink.syncedMeta.get("t1")).toEqual({
      conversationTitle: null,
      isGroup: false,
      participantCount: 2,
    });
  });

  it("skips threads whose watermark has not moved", async () => {
    const sink = new FakeSink();
    sink.cursors.set("t1", {
      threadId: "t1",
      lastMessageAt: new Date("2026-08-19T20:00:00.000Z"),
      lastMessagePreview: "hello",
      lastSyncedAt: new Date(),
    });
    const run = vi.fn(async (args: string[]) => {
      if (args[1] === "inbox") return ok([inboxRow("t1", "2026-08-19T20:00:00.000Z")]);
      throw new Error("thread-snapshot must not run for a fresh thread");
    });
    const poller = makePoller(sink, run);

    await poller.pollOnce();

    expect(sink.synced).toEqual([]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("caps snapshots per tick, most recent threads first", async () => {
    const sink = new FakeSink();
    const snapshotted: string[] = [];
    const run = vi.fn(async (args: string[]) => {
      if (args[1] === "inbox") {
        return ok([
          { ...inboxRow("t1", "2026-08-19T20:00:00.000Z"), rank: 1 },
          { ...inboxRow("t2", "2026-08-19T19:00:00.000Z"), rank: 2 },
          { ...inboxRow("t3", "2026-08-19T18:00:00.000Z"), rank: 3 },
        ]);
      }
      const threadUrl = args[args.indexOf("--thread-url") + 1];
      const threadId = threadUrl.split("/thread/")[1].replace("/", "");
      snapshotted.push(threadId);
      return ok([snapshotRow(threadId, `${threadId}-m1`)]);
    });
    const poller = makePoller(sink, run, { maxSnapshotsPerTick: 2 });

    await poller.pollOnce();

    expect(snapshotted).toEqual(["t1", "t2"]);
    expect(sink.synced).toEqual(["t1", "t2"]);
  });
});

describe("LinkedInInboxPoller fault handling", () => {
  it("routes an auth failure to onAuthRejected", async () => {
    const sink = new FakeSink();
    const run = vi.fn(
      async (): Promise<OpencliResult> => ({
        code: 69,
        stdout: "ok: false\nerror:\n  code: AUTH_REQUIRED",
        stderr: "",
      }),
    );
    const poller = makePoller(sink, run);
    const onAuthRejected = vi.fn();

    poller.start({ onAuthRejected });
    await vi.waitFor(() => expect(onAuthRejected).toHaveBeenCalledTimes(1));
    poller.stop();
    expect(poller.getRuntimeDegradation()).toBeNull();
  });

  it("reports a runtime degradation after two consecutive transient failures, and clears it on success", async () => {
    const sink = new FakeSink();
    let failing = true;
    const run = vi.fn(async (args: string[]): Promise<OpencliResult> => {
      if (failing) return { code: 1, stdout: "", stderr: "cdp unreachable" };
      if (args[1] === "inbox") return ok([]);
      return ok([]);
    });
    const poller = makePoller(sink, run, { minIntervalMs: 1, maxIntervalMs: 2 });
    const onAuthRejected = vi.fn();

    poller.start({ onAuthRejected });
    await vi.waitFor(() => expect(poller.getRuntimeDegradation()).not.toBeNull());
    expect(poller.getRuntimeDegradation()?.reason).toContain("failed");
    expect(onAuthRejected).not.toHaveBeenCalled();

    failing = false;
    await vi.waitFor(() => expect(poller.getRuntimeDegradation()).toBeNull());
    poller.stop();
  });
});
