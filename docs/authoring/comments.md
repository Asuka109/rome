# Code Comments

A **code comment** is prose inside a source file. The code states what happens. A comment carries only what the code cannot state: the contract a caller relies on, the why behind a non-obvious choice, or the design that keeps concurrent code safe. Tier tags and the bar this rulebook clears come from [authoring.md](authoring.md). The prose in this file follows [WRITING.md](WRITING.md).

The miss that earned this guideline: agent-written diffs kept arriving with comments that restate the line below them or narrate the change that produced them. Review caught each one by hand because the bar lived nowhere.

## Format

Every comment is one of three kinds, keyed by where it sits. Each kind has its own content rule.

### Module comment

A module comment sits at the top of the file, detached from any declaration — a comment attached to one is a boundary or body comment. When a [concept](../concepts/index.md) or [architecture](../architecture/index.md) doc covers the module's behavior, the comment links to that doc and adds only what is local to the file. It never restates the doc. `[llm]`

> Prefer: `// WhatsApp adapter. Channel contract: docs/architecture/channels.md.`
> Over: a file header that re-explains message routing, which channels.md already owns.

### Boundary comment

A boundary comment sits on an exported symbol or a public member of one — a function, type, action, or class field another module relies on. It states the semantics: what the caller may rely on that the signature cannot carry. Units, null and error behavior, side effects, ordering, invariants. It never describes the implementation. `[llm]`

> Prefer: `/** Returns the session for the id, or null when none exists. Never creates one. */`
> Over: `/** Looks up the id in the session map and returns the result. */`

When the name and the types carry the full contract, the symbol carries no comment. `[llm]`

> Prefer: `function isExpired(session: Session): boolean` with no comment.
> Over: `/** Checks whether the session is expired. */` above it.

### Body comment

A body comment sits anywhere the other two kinds do not: inside a function, or on a declaration no other module imports. Body comments are exceptions — most code carries none. A body comment states a why the code cannot: the reason for a non-obvious choice, or a deviation from common practice and the reason for it. `[llm]`

> Prefer: `// Baileys delivers history newest-first, so index 0 is the latest message.`
> Over: `// iterate over the messages in reverse`.

## Admission

A comment enters when a competent reader of the code alone would miss something true and load-bearing. A comment that restates the code fails. `[llm]`

> Prefer: `// The webhook can arrive before the DB row commits — retry, do not 404.`
> Over: `// increment the retry counter`.

Concurrency is non-trivial when correctness depends on an ordering between tasks, a lock discipline, shared mutable state, or cancellation that no type or API enforces. Non-trivial concurrency always clears the bar, and a missing comment there is a defect. State the lock order, what a lock guards, why an unsynchronized access is safe, or the ordering two tasks depend on. `[llm]`

> Prefer: `// Only the session loop writes activeSessions, so this read needs no lock.`
> Over: the same unsynchronized read with nothing stating why it is safe.

A comment describes the code as it is, for a reader who never saw a previous version. Narrating the change — what the code did before, or how this version differs — fails, whatever the wording. Present-tense prose passes even when it contains a phrase like *no longer* or *used to*. `[llm]`

> Prefer: `// After unref, the timer no longer keeps the process alive.`
> Over: `// This handler no longer retries — retry moved into the queue worker.`

Git history owns provenance. A comment never cites the change, ticket, or PR that produced the code. An external reference enters only when it is a live constraint on the code beside it. `[llm]`

> Prefer: `// Workaround: grammy drops the reply markup on editMessageText — re-send the keyboard instead.`
> Over: `// added in PR #1234 to fix the retry bug.`

## Eviction

A comment falsified by a code change leaves in that change, not in a follow-up. `[llm]`

> Prefer: the diff that makes retries configurable also deletes `// retries three times`.
> Over: the same diff shipping with the comment still claiming three.

A comment that fails the admission bar leaves on sight. Deleting one needs no issue and no discussion. `[human]`

## Intake

A correction about comments that recurs in review either becomes a rule in this file, or the maintainer rejects it in writing and states the reason. Silent recurrence means this file is dead. `[human]`

When the same why needs stating at three or more sites, it stops being a comment. Give it one home the sites can point to — the module that owns the behavior, or an [architecture](../architecture/index.md) doc. A [concept](../concepts/index.md) entry or an [ADR](../adrs/) takes it only when it clears that family's admission bar. `[human]`
