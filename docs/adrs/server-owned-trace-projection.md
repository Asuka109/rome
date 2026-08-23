# Server computes the agent-trace projection — the client only renders it

- **Status**: Accepted
- **Date**: 2026-08-11
- **Architecture**: [API surface — HTTP surface](../architecture/api.md#http-surface)

## Context

The agent trace answers one question for the guardian: what did this turn do? It shows which tools ran, which app owns each one, where a sub-agent took over, and how long each run took. Building that view from the raw stream blocks needs the app registry, each app's icon URL, the override table for built-in tools, and the owning app of every agent artifact. All of those inputs live on the server.

One projection has several consumers. A turn streams over SSE while it runs. A client that lost that stream reattaches to the same turn mid-flight. The same turn is read back from a persisted message later, and a shared conversation freezes it for a login-free reader. Every one of those paths has to produce the same segments from the same blocks. The guardian compares what they watched against what they reload.

Persistence stores raw blocks, not segments, so the rules that turn blocks into segments stay free to move. They do move as the trace grows. The tool-to-app resolver wires them to the app registry, and provider-native agent plans add another block kind to the same stream. Whoever owns the rules absorbs every one of those changes. A rule that lives in the client bundle forces both sides to ship together each time it moves.

The trace endpoints sit in the dashboard category of the [HTTP surface](../architecture/api.md#http-surface), so the wire between server and client is a contract like any other route.

## Decision

The server projects raw agent-stream blocks into ordered trace segments plus a summary, and serves that projection on the live stream and on historical reads. The client upserts segments by id and renders them, and never recomputes the projection.

## Alternatives

- **Stream raw blocks and aggregate them on the client.** Rejected because the inputs the projection needs are server data: app ownership of a tool, icon URLs, built-in-tool overrides, the owning app of an agent artifact. The client would need a copy of all of it on the wire to reach the same answer, and every grouping-rule change would need a coordinated release of both sides.
- **Export the app registry to the client and keep the aggregation there.** Rejected because the registry carries the profile's installed apps and the override table. That is a large, privileged surface to publish to a browser bundle for a presentational need.
- **Aggregate on the client during the live stream and on the server for historical reads.** Rejected because two implementations of the same fold drift apart. The drift lands where it is most visible: a reload renders a turn differently from how the guardian watched it.
- **Persist computed segments instead of raw blocks.** Rejected because the projection would then freeze at write time. Every rule change would need a migration and a backfill, and old messages would keep rendering under the rules in force when they were written.
- **Send raw blocks alongside the segments on the render wire as a fallback.** Rejected because a second raw path invites the client to re-derive whenever the projection looks wrong, which restores the client aggregator through the back door. The raw dump the drawer links to is a download for offline inspection, and no renderer parses it.
- **Group segments by sub-agent on the server and put the tree on the wire.** Rejected because collapsing an ordered list into per-agent sections is layout, and fixing the layout in the protocol turns a visual change into a wire change. The segment list stays flat and ordered by ordinal. What the summary carries about a sub-agent is a reference to that child turn, not a section of the list.

## Consequences

One code path serves the live turn, the reattach, the reload, and the shared copy, so a trace looks the same in all of them. A grouping-rule change ships with the backend alone. The resolver behind the projection can change where it looks an app up with no client diff.

The wire becomes the constraint. The client keys segments by id and keeps the order it first saw them in. So segment ids have to stay stable across upserts, and the server has to emit each segment's first upsert in ordinal order. Anything new the trace shows has to enter as a field on the projection types. The client cannot patch a projection bug on its own. A long turn also pushes more bytes, because the server re-emits a segment's full payload on every update.

Future diffs must respect three things. The render path carries the projection and nothing else — the live stream emits segments and summaries, the reads that feed the drawer return a snapshot, and the raw dump stays an attachment no renderer reads. New trace content enters through the server projection rather than through a parallel channel. Client-side grouping stays presentational — a diff that reads a block's contents to decide what a segment is has moved the projection back to the client.
