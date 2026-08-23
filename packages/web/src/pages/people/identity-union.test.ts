// The union the mock builds, exercised directly. `identity-contract.test.ts`
// covers the shared rules; this file asks whether the fixtures the dashboard
// runs against satisfy them.
//
// Deliberately thin on mock behavior. The mock's job is to serve data shaped
// like the route's, so what is worth pinning here are invariants the shape
// itself has to hold — unique ids, a `latest` that matches the timeline — not
// logic the mock would have to reimplement and then keep in sync.
import { describe, expect, it } from "vitest";
import { compareIdentityRows } from "@rome/api-types/identities";
import { buildIdentities, buildTimeline, listUnknownSenders } from "../../../mock/handlers/people";

const union = buildIdentities();
const lin = union.find((row) => row.displayName === "林晓");

describe("an identity with several log rows", () => {
  it("previews the newest of them, not the first", () => {
    // The log keys on the exchange rather than the sender, so 林晓 holds two
    // rows. Reading the first previewed a line older than the top of the
    // identity's own timeline.
    expect(lin?.latest?.preview).toBe("另外周五的场地换到 3 楼了");
  });
});

describe("latest is the head of the row's own timeline", () => {
  it("holds for every row in the union", () => {
    // The two orderings settle a same-second tie differently, so computing
    // `latest` apart from the timeline lets a row preview one event and open on
    // another. Deriving one from the other makes that unrepresentable.
    for (const row of buildIdentities()) {
      const head = (buildTimeline(row.id) ?? [])[0];
      if (!head) {
        expect(row.latest, `${row.id} has no entries but reports a dynamic`).toBeNull();
        continue;
      }
      expect(row.latest, row.id).toEqual({
        source: head.source,
        timestamp: head.timestamp,
        preview: head.body,
      });
    }
  });
});

describe("a WhatsApp sender the mirror has not captured", () => {
  it("still has a timeline and a latest", () => {
    // The sentinel records an arrival before the mirror syncs the thread.
    // Skipping the sentinel for WhatsApp left such a row with no entries, a
    // null `latest`, and no place in the Unknown chip — an identity that has
    // plainly messaged, reported as silent.
    const jid = "5511987654321@s.whatsapp.net";
    const row = buildIdentities().find((r) => r.id === `channel:whatsapp:${jid}`);
    expect(row, "the unmirrored WhatsApp sender fixture is missing").toBeDefined();

    expect(buildTimeline(row!.id) ?? []).not.toHaveLength(0);
    expect(row!.latest?.preview).toBe("oi, tudo bem? vi seu contato no grupo");
    expect(row!.neverMessaged).toBe(false);
  });
});

describe("the union as a whole", () => {
  it("gives every row a unique id", () => {
    expect(new Set(union.map((row) => row.id)).size).toBe(union.length);
  });

  it("never lists one channel identity under two rows", () => {
    const seen = new Map<string, string>();
    for (const row of union) {
      for (const channel of row.channels) {
        const k = `${channel.channel}\n${channel.channelUserId}`;
        expect(seen.has(k), `${k} appears on ${seen.get(k)} and ${row.id}`).toBe(false);
        seen.set(k, row.id);
      }
    }
  });

  it("sorts totally, so paging cannot repeat or drop a row", () => {
    const sorted = [...union].sort(compareIdentityRows);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(compareIdentityRows(sorted[i - 1], sorted[i])).toBeLessThan(0);
    }
  });

  it("builds a timeline for every row it exposes", () => {
    for (const row of union) {
      expect(buildTimeline(row.id), `no timeline for ${row.id}`).not.toBeNull();
    }
  });
});

describe("the legacy unknown queue", () => {
  it("shows one card per sender, carrying their newest line", () => {
    const queue = listUnknownSenders();
    const keys = queue.map((s) => `${s.channel}\n${s.channelUserId}`);

    expect(new Set(keys).size).toBe(keys.length);
    expect(queue.find((s) => s.displayName === "林晓")?.lastMessage).toBe(
      "另外周五的场地换到 3 楼了",
    );
  });
});
