# Hook recursion depth follows the causal chain, not process boundaries

- **Status**: Accepted
- **Date**: 2026-08-11
- **Concept**: [apps — hooks](../concepts/apps.md#hooks)

## Context

A [hook](../concepts/apps.md#hooks) can cause more Rome work, and that work fires more hooks. A lifecycle hook starts a forked turn, the forked turn finishes, and the same lifecycle hook fires again. A hook runs an action, the action runs in a worker process, the worker asks the main process for an agent turn, and that turn dispatches hooks of its own. The useful case and the unbounded loop have the same shape, so nothing in the payload separates them.

The loop rarely stays in one place. It crosses in-process async boundaries, leaves the main process for an action worker, comes back over the agent-turn call, and starts again. A guard that sees only one of those hops measures a fragment of the chain and reads a runaway loop as a series of short, healthy ones.

Hooks run in a shared runtime. Every app's hooks execute against the same process as every other app's, so one app's missing filter spends capacity that belongs to all of them. App-side filtering stays necessary for product reasons and is not sufficient as the backstop.

The work that causes a dispatch is real. A guardian message, an external webhook delivery, a routine run, or a forked turn already carries its own meaning and its own side effects. Whatever the guard does when it runs out of room, it decides something about the hook, not about the turn that caused it.

## Decision

A hook's causal chain — root id, depth, and the identity of every hook already entered — travels with the work the hook causes, across in-process async work, the action worker process, and the agent turns that worker starts. A fresh root appears only where no hook caused the work, plus one explicit clear for a routine run.

## Alternatives

- **Treat a queued or cross-process job as a fresh execution context, the industry default.** Rejected because a process boundary is exactly where a loop stops being visible. A hook reaches an action worker and the worker reaches back into main for an agent turn, which is the shape the budget exists to catch. A reset there leaves the guard blind to the one case it was built for.
- **Treat immediate action execution as a fresh root.** Rejected because a hook that invokes an action directly would launder its own depth. Every hook the action then triggers restarts at zero, and the same chain runs forever one action call at a time.
- **Put loop protection in each hook type, so lifecycle hooks guard themselves.** Rejected because the chain leaves the hook type that started it. A lifecycle hook reaches a forked turn and an action worker before the same lifecycle event fires again, and every hook type Rome adds would have to rebuild the same guard.
- **Count depth on agent turns only.** Rejected because a turn counter cannot tell two hooks apart. The common runaway is one hook re-entering itself while its siblings on the same turn stay healthy, and only a per-hook identity separates them.
- **Rely on app authors to filter and deduplicate.** Rejected because hooks share one runtime. A correct app cannot protect itself from a neighbor's missing filter, so the backstop has to sit where every app's hooks pass through.
- **Let one hook identity repeat up to the total depth budget.** Rejected because the self-triggering hook is the common loop, and it would consume the entire budget before anything noticed. Allowing one appearance of a `(hookType, appId, hookName)` per chain catches that loop on its first repeat.
- **Fail the causing turn when a chain exceeds its budget.** Rejected because an exceeded budget is a statement about the hook, not about the guardian turn, webhook delivery, or routine run underneath it. A defensive limit that destroys real work costs more than the loop it prevents.
- **Abort the whole fan-out when one candidate exceeds its budget.** Rejected because siblings are causally independent. One app's runaway hook would silence unrelated apps that happen to listen to the same event.
- **Let an app raise its own budget in its manifest.** Rejected because an app that hits the budget has a filtering or idempotency problem. A per-app override sells the app a way out of the guard that protects everyone sharing the runtime.

## Consequences

A loop is bounded wherever it runs. The chain measures causality rather than process lifetime, so a hook that reaches through an action, a worker process, and an agent turn still meets the same budget it would meet in one function call. The root id and the recorded chain name the whole path in one log line and one span event, which turns a skipped hook into a readable story rather than an isolated warning.

The cost lands on anyone adding a new path that can dispatch hooks. A durable queue, a cross-process hop, or a new dispatcher has to carry the core-owned context and restore it before dispatching, and forgetting is quiet. The chain simply starts over, the guard keeps reporting healthy depths, and the loop returns. A hook with a legitimate reason to run twice in one chain also loses, because the answer is event filtering or idempotency, never a larger budget.

Future diffs must respect:

- A new hook dispatcher reads the current context and evaluates each candidate against it. It mints a root only when there is no current context.
- A new durable queue or cross-process hop carries the core-owned context with the enqueued work and restores it before dispatching hooks.
- Core clears the chain only for a routine run, which must not inherit the chain of the hook that created the routine. Crossing a queue, a process, or an immediate action call never clears it.
- A candidate that exceeds its budget is a logged skip with telemetry. It never fails the causing turn and never suppresses a sibling candidate.
- The depth budget stays process-wide configuration. An app does not set its own.
