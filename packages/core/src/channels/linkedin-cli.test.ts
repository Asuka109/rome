import { describe, expect, it, vi } from "vitest";
import {
  OpencliAuthError,
  OpencliCommandError,
  parseInbox,
  parseSafeSend,
  parseThreadSnapshot,
  parseWhoami,
  safeSendLinkedInReply,
  type OpencliResult,
} from "./linkedin-cli.js";

function ok(stdout: string): OpencliResult {
  return { code: 0, stdout, stderr: "" };
}

describe("parseWhoami", () => {
  it("returns the identity of a signed-in session", () => {
    const identity = parseWhoami(
      ok(
        JSON.stringify({
          logged_in: true,
          site: "linkedin",
          public_id: "jane-doe",
          plain_id: "12345",
          name: "Jane Doe",
        }),
      ),
    );
    expect(identity).toEqual({ publicId: "jane-doe", plainId: "12345", name: "Jane Doe" });
  });

  it("treats a clean logged_in: false as an auth error, not a command failure", () => {
    expect(() => parseWhoami(ok(JSON.stringify({ logged_in: false })))).toThrow(OpencliAuthError);
  });

  it("treats an unexpected shape as transient", () => {
    expect(() => parseWhoami(ok(JSON.stringify({ nope: 1 })))).toThrow(OpencliCommandError);
  });
});

describe("failure classification", () => {
  it("classifies an auth-marked failure as OpencliAuthError", () => {
    const result: OpencliResult = {
      code: 69,
      stdout: "ok: false\nerror:\n  code: AUTH_REQUIRED\n  message: sign in first",
      stderr: "",
    };
    expect(() => parseInbox(result)).toThrow(OpencliAuthError);
  });

  it("classifies the plugin's auth-wall phrasing as OpencliAuthError", () => {
    const result: OpencliResult = {
      code: 1,
      stdout: "",
      stderr: "Error: reading this thread requires an active signed-in LinkedIn browser session.",
    };
    expect(() => parseThreadSnapshot(result)).toThrow(OpencliAuthError);
  });

  it("classifies any other non-zero exit as transient", () => {
    const result: OpencliResult = {
      code: 69,
      stdout: "ok: false\nerror:\n  code: BROWSER_CONNECT\n  message: extension not connected",
      stderr: "",
    };
    expect(() => parseInbox(result)).toThrow(OpencliCommandError);
  });

  it("classifies empty output as transient", () => {
    expect(() => parseInbox(ok(""))).toThrow(OpencliCommandError);
  });

  it("classifies unparseable exit-0 output with an auth marker as auth", () => {
    expect(() => parseInbox(ok("ok: false\nerror: not logged in"))).toThrow(OpencliAuthError);
  });
});

describe("parseInbox", () => {
  it("maps listing rows, parsing the ISO timestamp", () => {
    const rows = parseInbox(
      ok(
        JSON.stringify([
          {
            rank: 1,
            thread_url: "https://www.linkedin.com/messaging/thread/2-abc==/",
            thread_id: "2-abc==",
            person_name: "Ada Lovelace",
            last_message_preview: "See you Sunday?",
            unread: true,
            counterparty_type: "member",
            category: "INBOX,PRIMARY_INBOX",
            timestamp: "2026-08-19T20:52:09.488Z",
          },
        ]),
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].threadId).toBe("2-abc==");
    expect(rows[0].unread).toBe(true);
    expect(rows[0].lastMessageAt?.toISOString()).toBe("2026-08-19T20:52:09.488Z");
  });

  it("tolerates missing optional fields and bad timestamps", () => {
    const rows = parseInbox(
      ok(
        JSON.stringify([{ thread_url: "https://x/", thread_id: "t1", timestamp: "yesterday-ish" }]),
      ),
    );
    expect(rows[0].rank).toBe(1);
    expect(rows[0].personName).toBeNull();
    expect(rows[0].unread).toBe(false);
    expect(rows[0].lastMessageAt).toBeNull();
  });
});

describe("parseThreadSnapshot", () => {
  it("maps message rows, folding an empty sent_at to null", () => {
    const messages = parseThreadSnapshot(
      ok(
        JSON.stringify([
          {
            thread_url: "https://x/",
            thread_id: "t1",
            conversation_name: "",
            returned_index: 1,
            returned_message_count: 2,
            message_id: "m1",
            sent_at: "2026-08-19T20:52:09.488Z",
            sender_name: "Ada Lovelace",
            sender_type: "member",
            sender_profile_url: "https://www.linkedin.com/in/ada/",
            sender_headline: "Engineer",
            sender_is_self: false,
            text: "See you Sunday?",
            subject: "",
            reaction_count: 1,
            is_latest: false,
          },
          {
            thread_id: "t1",
            message_id: "m2",
            sent_at: "",
            sender_is_self: true,
            text: "Yes!",
          },
        ]),
      ),
    );
    expect(messages).toHaveLength(2);
    expect(messages[0].sentAt?.toISOString()).toBe("2026-08-19T20:52:09.488Z");
    expect(messages[0].reactionCount).toBe(1);
    expect(messages[1].sentAt).toBeNull();
    expect(messages[1].senderIsSelf).toBe(true);
    // Rows from a pre-0.2.0 plugin carry no group metadata: unknown, not 1:1.
    expect(messages[1].conversationIsGroup).toBeNull();
    expect(messages[1].conversationTitle).toBeNull();
    expect(messages[1].participantCount).toBeNull();
  });

  it("carries the authoritative group metadata separately from the display name", () => {
    const messages = parseThreadSnapshot(
      ok(
        JSON.stringify([
          {
            thread_id: "t1",
            message_id: "m1",
            conversation_name: "Evan Ye",
            conversation_title: "",
            conversation_is_group: false,
            participant_count: 2,
            sent_at: "2026-08-19T20:52:09.488Z",
            sender_is_self: false,
            text: "hi",
          },
          {
            thread_id: "t2",
            message_id: "m2",
            conversation_name: "Pitch review",
            conversation_title: "Pitch review",
            conversation_is_group: true,
            participant_count: 3,
            sent_at: "2026-08-19T20:52:09.488Z",
            sender_is_self: false,
            text: "notes",
          },
        ]),
      ),
    );
    // A 1:1 whose conversation_name is the counterparty's name stays 1:1.
    expect(messages[0].conversationIsGroup).toBe(false);
    expect(messages[0].conversationTitle).toBeNull();
    expect(messages[1].conversationIsGroup).toBe(true);
    expect(messages[1].conversationTitle).toBe("Pitch review");
    expect(messages[1].participantCount).toBe(3);
  });
});

describe("safeSendLinkedInReply", () => {
  it("calls opencli safe-send with thread verification and send enabled", async () => {
    const run = vi.fn(async () =>
      ok(
        JSON.stringify([
          {
            status: "sent",
            recipient: "Ada Lovelace",
            reason: "verified",
            thread_url: "https://www.linkedin.com/messaging/thread/2-abc==/",
            message_chars: 18,
            screenshot: "",
          },
        ]),
      ),
    );

    const result = await safeSendLinkedInReply(
      {
        threadUrl: "https://www.linkedin.com/messaging/thread/2-abc==/",
        expectedName: "Ada Lovelace",
        message: "Thursday works!",
      },
      run,
    );

    expect(run).toHaveBeenCalledWith([
      "linkedin",
      "safe-send",
      "--thread-url",
      "https://www.linkedin.com/messaging/thread/2-abc==/",
      "--expected-name",
      "Ada Lovelace",
      "--message",
      "Thursday works!",
      "--send",
      "true",
    ]);
    expect(result).toEqual({
      status: "sent",
      recipient: "Ada Lovelace",
      reason: "verified",
      threadUrl: "https://www.linkedin.com/messaging/thread/2-abc==/",
      messageChars: 18,
    });
  });

  it("rejects a dry-run result because the reply was not sent", () => {
    expect(() =>
      parseSafeSend(
        ok(
          JSON.stringify([
            {
              status: "verified_dry_run",
              recipient: "Ada Lovelace",
              reason: "verified",
              thread_url: "https://www.linkedin.com/messaging/thread/2-abc==/",
              message_chars: 18,
            },
          ]),
        ),
      ),
    ).toThrow(OpencliCommandError);
  });
});
