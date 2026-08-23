import { describe, expect, it } from "vitest";
import {
  compareCodePoints,
  compareIdentityRows,
  canMoveToStranger,
  channelIdentityId,
  compareDisplayNames,
  compareTimelineEntries,
  identityMatchesQuery,
  latestDynamic,
  parseIdentityId,
  personIdentityId,
  encodeIdentityCursor,
  identityCursorOf,
  parseIdentityCursor,
  parseTimelineCursor,
  sliceIdentityPage,
  timelineCursor,
  type IdentityRow,
  type TimelineEntry,
} from "@rome/api-types/identities";
import { protectedPersonReason, STRANGER_PERSON_ID } from "@rome/api-types/persons";

function row(overrides: Partial<IdentityRow> & Pick<IdentityRow, "id">): IdentityRow {
  return {
    displayName: overrides.id,
    level: "unknown",
    channels: [],
    latest: null,
    messageCount: 0,
    neverMessaged: false,
    ...overrides,
  };
}

function spoke(id: string, timestamp: number, over: Partial<IdentityRow> = {}): IdentityRow {
  return row({
    id,
    latest: { source: "whatsapp", timestamp, preview: null },
    messageCount: 1,
    ...over,
  });
}

/** A silent address-book contact: on the ladder, but never a dynamic. */
function silent(id: string, over: Partial<IdentityRow> = {}): IdentityRow {
  return row({ id, neverMessaged: true, ...over });
}

describe("sliceIdentityPage counts", () => {
  const union = [
    spoke("channel:whatsapp:1", 300),
    spoke("person:ada", 200, { level: "inner-circle" }),
    silent("channel:whatsapp:9"),
    silent("channel:whatsapp:8"),
  ].sort(compareIdentityRows);

  it("counts silent contacts the page is holding back", () => {
    const page = sliceIdentityPage(union);

    expect(page.identities.map((r) => r.id)).toEqual(["channel:whatsapp:1", "person:ada"]);
    // The directory's "show N silent contacts" affordance reads this in the very
    // view that hides the rows, so it describes the union rather than the page.
    expect(page.neverMessagedTotal).toBe(2);
    expect(page.totals.unknown).toBe(3);
  });

  it("reports the same totals whether or not the page carries the silent rows", () => {
    const hidden = sliceIdentityPage(union);
    const shown = sliceIdentityPage(union, { includeNeverMessaged: true });

    expect(shown.identities).toHaveLength(4);
    expect(shown.neverMessagedTotal).toBe(hidden.neverMessagedTotal);
    expect(shown.totals).toEqual(hidden.totals);
    expect(shown.counts).toEqual(hidden.counts);
  });

  it("keeps the counts union-wide on a by-id fetch", () => {
    const page = sliceIdentityPage(union, { id: "person:ada", includeNeverMessaged: true });

    expect(page.identities.map((r) => r.id)).toEqual(["person:ada"]);
    // A client refreshing one row after a move reads the same envelope as one
    // that listed, so its chips cannot collapse to the single row it asked for.
    expect(page.counts).toEqual(sliceIdentityPage(union).counts);
    expect(page.totals).toEqual(sliceIdentityPage(union).totals);
    expect(page.neverMessagedTotal).toBe(2);
  });

  it("counts the whole union while one level's view is on screen", () => {
    const page = sliceIdentityPage(union, { level: "inner-circle" });

    expect(page.identities.map((r) => r.id)).toEqual(["person:ada"]);
    expect(page.totals.unknown).toBe(3);
    expect(page.neverMessagedTotal).toBe(2);
  });
});

describe("identity cursor", () => {
  it("resumes after a row that no longer exists", () => {
    const union = [spoke("person:a", 300), spoke("person:b", 200), spoke("person:c", 100)];
    const first = sliceIdentityPage(union, { limit: 2 });
    expect(first.identities.map((r) => r.id)).toEqual(["person:a", "person:b"]);
    expect(first.nextCursor).not.toBeNull();

    // `person:b` is merged away between the two requests — an ordinary write on
    // this page. The next page still has to carry what follows its position.
    const afterMerge = union.filter((r) => r.id !== "person:b");
    const second = sliceIdentityPage(afterMerge, {
      limit: 2,
      cursor: parseIdentityCursor(first.nextCursor),
    });

    expect(second.identities.map((r) => r.id)).toEqual(["person:c"]);
  });

  it("resumes after a row that left the filtered level", () => {
    const union = [
      spoke("person:a", 300, { level: "other" }),
      spoke("person:b", 200, { level: "other" }),
      spoke("person:c", 100, { level: "other" }),
    ];
    const first = sliceIdentityPage(union, { limit: 2, level: "other" });

    // Another tab promotes `person:b`, so it leaves the view being paged.
    const moved = union.map((r) =>
      r.id === "person:b" ? { ...r, level: "guardian" as const } : r,
    );
    const second = sliceIdentityPage(moved, {
      limit: 2,
      level: "other",
      cursor: parseIdentityCursor(first.nextCursor),
    });

    expect(second.identities.map((r) => r.id)).toEqual(["person:c"]);
  });

  it("pages the whole union without repeating or dropping a row", () => {
    const union = [
      spoke("person:a", 300),
      spoke("person:b", 200),
      spoke("person:c", 200),
      silent("person:d"),
      silent("person:e"),
    ].sort(compareIdentityRows);

    const seen: string[] = [];
    let cursor = null as string | null;
    do {
      const page = sliceIdentityPage(union, {
        limit: 2,
        includeNeverMessaged: true,
        cursor: parseIdentityCursor(cursor),
      });
      seen.push(...page.identities.map((r) => r.id));
      cursor = page.nextCursor;
    } while (cursor);

    expect(seen).toEqual(union.map((r) => r.id));
  });

  it("stops at the last page", () => {
    const page = sliceIdentityPage([spoke("person:a", 300)], { limit: 2 });
    expect(page.nextCursor).toBeNull();
  });

  it("round-trips a name carrying the separator", () => {
    const tricky = spoke("channel:whatsapp:41|7", 300, { displayName: "a|b" });
    const cursor = encodeIdentityCursor(identityCursorOf(tricky));

    expect(parseIdentityCursor(cursor)).toEqual(identityCursorOf(tricky));
  });

  it("round-trips an identity that has never done anything", () => {
    const cursor = encodeIdentityCursor(identityCursorOf(silent("channel:whatsapp:9")));
    expect(parseIdentityCursor(cursor)?.timestamp).toBeNull();
  });

  it("rejects a value that is not a cursor", () => {
    expect(parseIdentityCursor("person:a")).toBeNull();
    expect(parseIdentityCursor("nope|nope|")).toBeNull();
    expect(parseIdentityCursor("%E0%A4%A|a|person:a")).toBeNull();
    expect(parseIdentityCursor(null)).toBeNull();
  });
});

describe("protectedPersonReason", () => {
  it("refuses the guardian and the stranger sentinel", () => {
    expect(protectedPersonReason({ id: "ada", bondLevel: "guardian" })).toBe("guardian");
    // The sentinel carries an ordinary bond level, so its id is the only signal.
    expect(protectedPersonReason({ id: STRANGER_PERSON_ID, bondLevel: "other" })).toBe(
      "stranger-sentinel",
    );
  });

  it("accepts an ordinary person", () => {
    expect(protectedPersonReason({ id: "ada", bondLevel: "inner-circle" })).toBeNull();
  });
});

function entry(over: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    source: "whatsapp",
    timestamp: 100,
    body: null,
    direction: "inbound",
    ref: "r1",
    ...over,
  };
}

describe("timeline cursor", () => {
  it("round-trips a source and a ref carrying the separator", () => {
    const tricky = entry({ source: "app|notes", ref: "chat|1:msg|2" });
    const parsed = parseTimelineCursor(timelineCursor(tricky));

    expect(parsed?.source).toBe("app|notes");
    expect(parsed?.ref).toBe("chat|1:msg|2");
    // The decoded position has to compare equal to the entry it names, or the
    // next page resumes somewhere no entry sits.
    expect(compareTimelineEntries(parsed as TimelineEntry, tricky)).toBe(0);
  });

  it("keeps two entries whose separators would otherwise collide apart", () => {
    const a = entry({ source: "a|b", ref: "r" });
    const b = entry({ source: "a", ref: "b|r" });

    expect(timelineCursor(a)).not.toBe(timelineCursor(b));
    expect(compareTimelineEntries(a, b)).not.toBe(0);
  });

  it("rejects a value that is not a cursor", () => {
    expect(parseTimelineCursor("100|inbound|whatsapp")).toBeNull();
    expect(parseTimelineCursor("100|sideways|whatsapp|r1")).toBeNull();
    expect(parseTimelineCursor("|inbound|whatsapp|r1")).toBeNull();
    expect(parseTimelineCursor("100|inbound|whatsapp|")).toBeNull();
    expect(parseTimelineCursor("%E0%A4%A|inbound|whatsapp|r1")).toBeNull();
  });
});

describe("orderings are total", () => {
  it("separates canonically equivalent but distinct strings", () => {
    // `localeCompare` answers 0 for this pair, which would make two distinct
    // entries share one cursor position.
    expect("é".localeCompare("e\u0301")).toBe(0);
    expect(compareCodePoints("é", "e\u0301")).not.toBe(0);

    const a = entry({ ref: "é" });
    const b = entry({ ref: "e\u0301" });
    expect(compareTimelineEntries(a, b)).not.toBe(0);
  });

  it("separates two identities whose names differ only by normalization", () => {
    const a = spoke("person:a", 300, { displayName: "José" });
    const b = spoke("person:b", 300, { displayName: "Jose\u0301" });
    expect(compareIdentityRows(a, b)).not.toBe(0);
  });

  it("orders a reply above the line it answers", () => {
    const inbound = entry({ direction: "inbound", ref: "msg" });
    const reply = entry({ direction: "outbound", ref: "msg:reply" });
    expect(compareTimelineEntries(reply, inbound)).toBeLessThan(0);
  });
});

describe("orderings do not depend on the host locale", () => {
  it("orders a pair that English and Swedish collation disagree about", () => {
    // The mock runs in a browser and the route runs in Node, so a comparator
    // that reads the host locale lets a cursor written by one skip rows for
    // the other. A code-point fallback repairs a tie, never an inversion.
    expect("ä".localeCompare("z", "en")).toBeLessThan(0);
    expect("ä".localeCompare("z", "sv")).toBeGreaterThan(0);
    expect(compareDisplayNames("ä", "z")).toBe(compareDisplayNames("ä", "z"));
    expect(compareDisplayNames("ä", "z")).toBeGreaterThan(0);
  });

  it("sits the same name in different cases together", () => {
    expect(compareDisplayNames("ada", "Ada")).not.toBe(0);
    expect(compareDisplayNames("Ada", "bob")).toBeLessThan(0);
  });
});

describe("channel identity ids", () => {
  it("round-trips a user id carrying colons", () => {
    const id = channelIdentityId("whatsapp", "41755550111:12@s.whatsapp.net");
    expect(parseIdentityId(id)).toEqual({
      kind: "channel",
      channel: "whatsapp",
      channelUserId: "41755550111:12@s.whatsapp.net",
    });
  });

  it("refuses an id neither builder's parser would accept", () => {
    expect(() => personIdentityId("")).toThrow();
    expect(parseIdentityId(personIdentityId("ada"))).toEqual({ kind: "person", personId: "ada" });
  });

  it("refuses a channel that would make the id ambiguous", () => {
    // `channel:a:b:c` would otherwise mean two different things and decode as
    // one of them, pointing a write at the wrong mapping.
    expect(() => channelIdentityId("a:b", "c")).toThrow();
    expect(() => channelIdentityId("", "c")).toThrow();
    expect(() => channelIdentityId("whatsapp", "")).toThrow();
  });
});

describe("identityMatchesQuery", () => {
  const named = (displayName: string) => row({ id: "person:x", displayName });

  it("matches across Unicode normalization forms", () => {
    expect(identityMatchesQuery(named("Jose\u0301"), "José")).toBe(true);
    expect(identityMatchesQuery(named("José"), "Jose\u0301")).toBe(true);
  });

  it("matches a channel identifier as well as a name", () => {
    const withChannel = row({
      id: "channel:whatsapp:41755550111",
      displayName: "Unknown",
      channels: [{ channel: "whatsapp", channelUserId: "41755550111" }],
    });
    expect(identityMatchesQuery(withChannel, "41755550111")).toBe(true);
    expect(identityMatchesQuery(withChannel, "nope")).toBe(false);
  });
});

describe("canMoveToStranger", () => {
  it("refuses an identity with no channel to re-point", () => {
    // Dismissal maps a channel onto the sentinel, so a curated person the
    // guardian typed in before any channel matched them has nothing to move.
    // Offering the move anyway is what deletes the row.
    expect(canMoveToStranger(row({ id: "person:nadia", channels: [] }))).toBe(false);
  });

  it("allows an identity that holds one", () => {
    const placed = row({
      id: "person:ray",
      channels: [{ channel: "whatsapp", channelUserId: "14155550142" }],
    });
    expect(canMoveToStranger(placed)).toBe(true);
  });
});

describe("consolidated channel aliases", () => {
  it("finds a named @lid contact by the phone number behind it", () => {
    // The store can surface the @lid as representative while a saved name hides
    // the number, so a row carrying only its representative jid would be
    // unfindable by the number the guardian actually knows.
    const priya = row({
      id: "channel:whatsapp:184627390514@lid",
      displayName: "Priya Raman",
      channels: [
        { channel: "whatsapp", channelUserId: "184627390514@lid" },
        { channel: "whatsapp", channelUserId: "6591234567@s.whatsapp.net" },
      ],
    });

    expect(identityMatchesQuery(priya, "6591234567")).toBe(true);
    expect(identityMatchesQuery(priya, "Priya")).toBe(true);
  });
});

describe("latestDynamic", () => {
  const entry = (over: Partial<TimelineEntry> = {}): TimelineEntry => ({
    source: "whatsapp",
    timestamp: 100,
    body: "hello",
    direction: "inbound",
    ref: "r1",
    ...over,
  });

  it("projects the head of the ordering, whatever it is", () => {
    // One definition of "newest". A second comparison would settle a same-second
    // tie on its own terms, and a row could preview one event while its timeline
    // opened on another.
    const inbound = entry({ source: "telegram", direction: "inbound", ref: "a" });
    const outbound = entry({ source: "whatsapp", direction: "outbound", ref: "b" });
    const ordered = [inbound, outbound].sort(compareTimelineEntries);

    expect(latestDynamic(ordered)).toEqual({
      source: ordered[0].source,
      timestamp: ordered[0].timestamp,
      preview: ordered[0].body,
    });
    // The reply wins the ordering, so it is what the row previews.
    expect(latestDynamic(ordered)?.source).toBe("whatsapp");
  });

  it("carries a null body through as a null preview", () => {
    expect(latestDynamic([entry({ body: null })])?.preview).toBeNull();
  });

  it("is null for an identity with no entries", () => {
    expect(latestDynamic([])).toBeNull();
  });
});

describe("a by-id page", () => {
  it("answers about a silent row without being paired with the toggle", () => {
    // Forgetting the pairing returns an empty page with correct counts, from
    // which a client refreshing one row concludes the row is gone.
    const union = [silent("channel:whatsapp:9"), spoke("person:ada", 200)].sort(
      compareIdentityRows,
    );
    const page = sliceIdentityPage(union, { id: "channel:whatsapp:9" });

    expect(page.identities.map((r) => r.id)).toEqual(["channel:whatsapp:9"]);
  });

  it("answers about a row outside an active level filter", () => {
    const union = [spoke("person:ada", 200, { level: "inner-circle" })];
    const page = sliceIdentityPage(union, { id: "person:ada", level: "other" });

    expect(page.identities.map((r) => r.id)).toEqual(["person:ada"]);
  });
});
