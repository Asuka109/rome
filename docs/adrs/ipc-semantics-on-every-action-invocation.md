# Every action invocation carries IPC semantics, even in-process

- **Status**: Accepted
- **Date**: 2026-08-11
- **Concept**: [actions](../concepts/actions.md)

## Context

An [action](../concepts/actions.md) invokes another action through the app runtime, and the runtime decides where the callee runs. The caller may sit in the main process or in an action worker, and the callee may execute in the caller's process or in a separate worker the main process owns. That decision belongs to the engine and to the callee's own declaration. Marking an action cancellable pushes a nested call into another process, which moves every existing call site to the other transport without touching a line at any of those call sites.

The two transports do not carry the same things. Node's fork IPC serializes arguments and results, so a `Date` arrives as a string, `undefined` fields vanish, functions drop, and a circular structure throws. A thrown error crosses as data, so the class, the stack, and the `cause` do not survive. A co-located call can pass a live reference and rethrow the original object, so the callee can even mutate the caller's argument object.

The gap between the two can be closed in one direction only. No amount of work at the IPC boundary reconstructs a live reference or a foreign stack on the far side. Constraining the co-located call down to what IPC carries is available, and it costs a clone.

The failure this guards against gives no signal at author time. Code written against the richer path passes every test in one topology and behaves differently in the other, and the change that moves it is an edit to the callee, not to the caller. Apps are third-party-authorable, so the author of a call site neither owns nor sees the fork policy that decides its transport.

## Decision

Every app-facing invocation round-trips its arguments and its results through JSON and flattens every failure into `ActionInvocationError`, whether the callee runs in the caller's process or in a worker. There is no faster path for a co-located call.

## Alternatives

- **Keep a fast local path: pass live references in-process and serialize only at a real process boundary, the industry default.** Rejected because the caller does not own the choice of transport. Marking a callee cancellable moves every existing call site to the serializing path, and the call sites change behavior with no diff of their own to review.
- **Round-trip the data but propagate the original error when the callee is co-located.** Rejected because error inspection is where topology-dependent code hides best. A handler that branches on an error class or on `cause` takes one branch in the main process and the other branch in a worker, and both look correct in review.
- **Validate arguments against the IPC contract and pass the live object through when it passes.** Rejected because validation catches what cannot cross and misses what changes while crossing. A `Date` passes any such check and still arrives as a `Date` locally and as a string remotely, and the callee's mutations still leak back to a co-located caller.
- **Clone with a richer algorithm, such as structured clone, so `Date`, `Map`, and `undefined` survive.** Rejected because the target is not fidelity, it is the semantics of the fork IPC channel. A clone that preserves more than the channel does restores the exact divergence this decision removes.
- **Expose the execution mode to the caller so app code can write to the transport it gets.** Rejected because it turns a deployment fact into part of the app contract. Every installed app would then encode the fork policy, and the engine could not change when it forks without breaking them.
- **Apply the strict semantics under test and keep the fast path in production.** Rejected because it moves the divergence from between processes to between environments. The path that ships would then be the one no test exercises.

## Consequences

One contract covers every invocation, so a call site reads the same whichever process serves it. It covers every shape of the app-facing surface: a nested call, a detached dispatch that returns only an acceptance receipt, and an invocation that streams events alongside its result. Marking an action cancellable becomes a safe edit, because it changes where the callee runs and nothing about what its callers observe. A topology bug reproduces in a cheap in-process test rather than only under a worker. The app-facing SDK needs no IPC vocabulary at all, so a third-party app cannot take a dependency on a topology it cannot name.

The cost lands on every call. Each app-level invocation pays one JSON clone of its payload, including the calls that never leave the process, which makes payload size a per-call cost. Rich values do not survive the port: an action that returns a `Date` hands its caller a string, and `undefined` fields disappear. Circular arguments fail loudly instead of working locally. Debuggability moves out of the app-facing error, which carries the action name, a failure code, and the message. It carries neither a `cause` nor the callee's stack, so core logs the original before wrapping it.

Future diffs must respect:

- A new invocation path applies the same round-trip and the same error flattening in both modes. No path branches on whether the caller and callee share a process.
- An event a running action streams to its caller carries the same wire shape as a result, and the runtime enforces that shape where the action emits it.
- The clone tracks the fork IPC transport's semantics. A richer clone is a divergence from it, not an upgrade to it.
- Changing where the engine runs a callee stays invisible to app code. [Only the main process creates action workers](workers-never-fork-workers.md), and a caller cannot observe that ownership.
- A capability injected into app code behaves identically in the main process and in a worker, down to its timeout, not only in its type.
- Cancellation stays a control signal and passes through unwrapped. It is not a failure the app handles, so it is not flattened into the failure shape.
- A fix for a hard-to-debug failure adds detail to core's structured log. Enriching the app-facing error re-opens the gap between the two transports.
