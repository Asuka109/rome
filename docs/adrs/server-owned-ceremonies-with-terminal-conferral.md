# Conferral runs as a server-owned setup whose only durable write is its last act

- **Status**: Accepted
- **Date**: 2026-08-11
- **Architecture**: [Channels — connection setup](../architecture/channels.md#connection-setup)

## Context

A conferral is the act of a guardian handing Rome a credential a service thereafter accepts. A setup is the dialogue that leads there: input steps, presentations the guardian acts on out of band, hand-offs to a provider and back, plus validation and probing between them. Every setup in scope is linear with loops and branches. A bad token re-prompts, a scan is waited for, a consent screen sends the guardian out and returns them. A setup also suspends for as long as the guardian takes, so it must survive a closed tab and a second tab opened beside it.

The industry default gives each provider its own connect route and its own connect card. Rome shipped that default across ten services: two dozen bespoke route handlers, each with its own transport, polling contract, state machine, and error vocabulary, plus eight per-service connect cards holding flow and copy in JSX. One problem, ten dialects. Every new service re-invented a connect flow, contract testing faced one contract per service, and the guardian-facing copy lived in the web bundle where the desktop shell and an agent narrating a conferral could not reach it.

Proving a credential works often needs a live credential before the credential exists. OAuth implementations near-universally resolve that by persisting the credential when the callback lands and verifying afterwards. The cost is a half-connected state that callers can observe: a grant reads authorized while nothing behind it works. Each service then grows a status route to paper over the gap, and a failed verification leaves written material to clean up. A probe can also collide with the running system, because a second reader of the same Telegram bot token draws a hard rejection from the provider.

A setup holds coroutine state in memory, which dies with the process. Buying durable execution up front is a heavy machine to add before the protocol has soaked in production. The repo also holds every service to a backward-compatible cutover, so a generic surface has to land beside the bespoke one rather than replace it in a single step.

## Decision

Every conferral runs as a server-owned setup — linear integration code the server pumps, whose entire guardian-facing surface is the closed verb set of prompt, show, and redirect. The coroutine returns once the credential is proven working, and the runtime turns that return into the conferral: one transaction, and the setup's only write to the grant ledger.

## Alternatives

- **Keep a connect route and a connect card per provider, as the industry default does.** Rejected because the per-service surface is where the dialects come from. Ten services meant ten transports, ten polling contracts, and ten error vocabularies, so each new integration paid the cost again and contract testing scaled with the service count rather than staying at one protocol. It also strands setup copy in the web bundle, which leaves the desktop shell and a chat-driven conferral with nothing to render.
- **Keep the flow on the client and give the server a generic credential API.** Rejected because the guardian-facing knowledge — step order, the retry after a bad token, the instructions — then lives next to the client, so every surface re-implements every service. A non-web surface cannot run a conferral at all, and the payloads stop being self-describing.
- **Have builders declare an explicit state machine of states, transitions, and handlers.** Rejected because the conferrals in scope are linear with loops, which asynchronous code already expresses directly. A declared machine makes the builder hand-encode control flow the language provides, and maintain by hand the observable states that would otherwise fall out of the suspension points.
- **Add a wait verb so a setup can block on an external event.** Rejected because waiting for a scan or an inbound message is server-side code, not guardian interaction, and a wait verb would bake the client transport into the builder vocabulary. The guardian-facing state during such a wait is the last presented view, which the existing verbs already produce.
- **Let a setup call service-specific client code.** Rejected because a payload that only one component understands re-fragments the protocol into per-service dialects, which is the condition being left behind. It also pins conferral to the web client, since no other surface can execute that code.
- **Let a custom component carry its own payload requirements and its own interaction.** Rejected because the moment a state is renderable by exactly one component, the generic renderer stops being a fallback and the closed verb set stops holding in practice.
- **Persist the credential when the callback lands and verify afterwards.** Rejected because it makes the half-connected state observable, which is the defect the protocol exists to remove. A written but unproven credential forces a per-service status route, leaves cleanup work behind every failed verification, and makes an interrupted setup unsafe to simply restart.
- **Run the proof of working through the real adapter on the pending credential.** Rejected because a real adapter epoch on unconferred material is itself a half-live connection, and it fights whatever adapter is already running for that grant. Re-conferring a connected Telegram bot would have two readers on one token, which the provider rejects outright.
- **Stop the running adapter so a probe can take a credential the adapter already holds.** Rejected because taking a working channel offline to re-confer it turns a credential rotation into an outage the guardian did not ask for. An integration instead skips the step whose probe would collide, and otherwise hands the guardian the provider's rejection as a readable instruction to disconnect first.
- **Land the conferral in more than one write, for example material first and profile or the guardian mapping after.** Rejected because any reader between the writes sees a connection it cannot trust, and abandonment mid-sequence leaves exactly the partial record the decision forbids.
- **Address a setup per connection rather than per grant.** Rejected because authority arrives per conferral. A service with two independent conferrals would need special casing, and its connect would become all-or-nothing even though its grants degrade independently.
- **Start a new setup on every start request.** Rejected because a guardian who closes a tab would leave an invisible live setup wedging the grant, and two tabs would run rival setups whose probes fight each other over one credential.
- **Accept guardian input, respond immediately, and let the client poll for the outcome.** Rejected because it pushes a polling loop into every client after every interaction, and a polled completion could overtake the ledger write, so a client that reads the setup as finished could still find the grant unauthorized.
- **Reuse the setup id as the OAuth `state` parameter.** Rejected because `state` is a front-channel anti-forgery capability and the setup id fails every property that role needs. The id is a discovery-friendly handle the client already carries, it does not expire, it is not bound to a provider, and it is not consumed on use. The hand-off instead carries the brokered attempt's own nonce, which already has those properties.
- **Make setups survive a server restart through a journal-replay runtime.** Rejected because a single terminal write already makes an interrupted setup safe to restart, so the durable-execution machinery buys ordering guarantees that are already free. Deferring it costs one restarted dialogue and keeps the door open, since every external wait is already labeled and cancellable.

## Consequences

Adding an integration gets cheaper. A builder writes one linear function, names the guardian steps, and gets a working connect surface with no route and no component. Copy is authored server-side next to the coroutine, so any surface can render or narrate a setup from its payload alone. One protocol carries one contract to test, and post-conferral configuration surfaces stay outside it in their own named homes.

The credential ledger gets simpler to reason about. Abandonment at any point leaves the grant ledger untouched, so a closed tab, a failed probe, and a dead server all land in the same clean state. A grant that reads connected was proven working, which removes the per-service status route and the guardian-visible limbo behind it. Restarting an interrupted setup is safe for the same reason.

The costs land on builders and on the guardian in flight. Proving a credential needs a throwaway probe per integration. A probe that would share a credential with a running adapter has to skip its step or surface the provider rejection as a readable failure, because Rome does not take a live channel down to re-confer it. A setup does not outlive a server restart, so a guardian mid-flow starts over. Anything a setup needs from the guardian has to be expressible as a form, a view, or a hand-off, and guardian-facing copy lives in server code rather than in the web bundle.

Future diffs must respect the [connection setup invariants](../architecture/channels.md#connection-setup):

- A new integration expresses its connect flow as a setup on the grant's auth scheme in its descriptor. No connect, pairing, or status route is added per service, and no per-service connect card.
- The verb set stays closed. Growing it is a protocol change with its own record, not a convenience patch inside one integration.
- No setup reaches the client except through a payload the standard renderer could display. A custom component overrides presentation for one service and state, and adds no interaction the verbs do not model.
- The conferral is the setup's last act and its only write to the grant ledger. Minting a never-connected service's row, the credential, the profile, and any guardian mapping land in one transaction or not at all.
- Proof of working runs against the pending credential on a setup-owned probe. The real adapter epoch starts after the write.
- One setup confers one grant. At most one setup is active per addressed grant, and a second start re-attaches to the live one rather than spawning a rival.
- A mutating request settles before it responds, and a finished setup is never observable before its ledger write lands.
- The return leg correlates through the brokered attempt's own opaque, single-use, provider-bound, expiring value, and resumes only a setup parked at its hand-off. The setup id is never that value.
- Every external wait stays labeled and cancellable, so a replay runtime can land underneath it without changing integration code.
