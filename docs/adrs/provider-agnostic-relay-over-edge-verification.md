# The webhook relay is a dumb pipe: provider verification happens in the app, not at the edge

- **Status**: Accepted
- **Date**: 2026-08-11
- **Architecture**: [API surface](../architecture/api.md)

## Context

A Rome instance behind NAT has no address a webhook sender can dial, and a desktop instance is asleep for much of the day. The relay is the public front door that stands in for it: a sender posts to a per-instance mailbox, the mailbox buffers the delivery durably, and the instance drains it over a WebSocket whenever it next comes online. The relay is therefore reachable by anyone on the internet, and it runs as a separate deployable in a different trust domain from both the instance and the apps installed on it.

Senders do not agree on how a payload proves it is genuine. Each one brings its own signature scheme, header names, secret, and rotation schedule. The secret that verifies a delivery is never the relay's to hold, and each sender establishes it with a different party on the instance side. The connector app mints one GitHub HMAC secret per instance and registers it on every hook it creates. Composio issues its own secret when that app points a project at the mailbox. Rome Cloud provisions a per-inbox mail secret that the instance's email channel verifies against.

Scale decides where a secret can rest. The design targets around 100K mailboxes. A verifier at the edge needs one secret per instance per provider, replicated to every datacenter that answers a deposit, and re-synced on every rotation. The relay today stores no per-instance secret at all — it holds only the public half of the minting keypair and checks a signature.

The binding between the relay and the code that consumes a frame is one manifest string. An app declares `api.relayWebhook`, the drainer resolves the installed app declaring it, and the frame is dispatched in-process. The relay names no app and no provider. One mailbox already carries three senders, and the consuming app tells them apart by header after the frame lands.

The industry default runs the other way. A hosted webhook ingress such as Svix or Hookdeck verifies the sender's signature at the edge and rejects a forged or unsigned payload before it is ever buffered. That default is attractive here for the same reason it is attractive there: it keeps garbage out of the durable buffer. It has already been re-proposed once inside Rome. Routing GitHub webhooks through the relay opened by considering a GitHub-shaped relay path and had to restate that the relay must not parse GitHub payloads or verify `X-Hub-Signature-256`, and that the connector app stays the trust boundary.

## Decision

The relay buffers and forwards the raw method, path, headers, and body without parsing the payload or checking any sender signature. Possession of the high-entropy `mailboxId` plus a per-instance rate limit authorizes a deposit, and the instance is the trust boundary for every provider payload — the app that declares `api.relayWebhook`, or the core surface that app hands a raw frame to.

## Alternatives

- **Verify the provider's signature at the edge before buffering, as a hosted webhook ingress does.** Rejected because one sender and one instance establish the verifying secret between themselves, so the edge would have to hold and re-sync one secret per instance per provider across ~100K mailboxes. A relay compromise would then read every one of them.
- **Add a provider-specific deposit route that knows one sender's scheme.** Rejected because every new sender then needs a relay deploy and a matched core release before any app can receive it, which is the coupling that had to be turned back when the second sender arrived.
- **Verify at the edge and again on the instance.** Rejected because two verifiers on one signature drift apart at rotation: the instance replaces the secret with the provider, and the edge starts rejecting deliveries the instance would have accepted.
- **Sniff header shape at the edge to drop deliveries that carry no recognized signature header.** Rejected because header shape is forgeable, so the check buys no security, and it turns the relay's accept set into a list of known providers — the provider knowledge this design keeps out.
- **Parse the payload at the edge to filter events the instance is not subscribed to.** Rejected because subscription state lives on the instance and changes on the guardian's schedule, so the edge would mirror instance state that moves without a relay deploy.
- **Give the deposit face its own credential that the relay checks.** Rejected because a provider's webhook configuration accepts a URL and nothing else, so the credential has to live in the URL — which is what the high-entropy `mailboxId` already is. Checking anything more forces per-instance secret storage back onto the edge.
- **Share one symmetric secret between the relay and the minter, the normal choice for two services one team operates.** Rejected because a shared secret at the edge lets a relay compromise mint drain access to any mailbox. The Ed25519 split leaves the signing capability with the minter and gives the edge only the public half.
- **Merge the relay into core, or build it around the first sender.** Rejected because a relay coupled to one app has to be rewritten when the second sender lands, and the generic front door costs one manifest string instead.
- **Hold the sender's request open and answer with the instance's response.** Rejected because the instance may be offline for hours, so a synchronous response converts an ordinary sleeping desktop into sender-side timeouts and retries.

## Consequences

A new webhook sender lands entirely on the instance. The instance registers its subscription, holds its own secret, and verifies its own deliveries, while the relay and its deploy pipeline stay untouched. The relay carries no provider code, so its release cadence is independent of core's and of any app's. Because the edge stores no per-instance secret and no private key, a compromised relay yields buffered bytes rather than credentials or drain access, and secret rotation is a two-party matter between the instance and the provider.

The costs land on the buffer and on the instance. Anyone holding a `mailboxId` can fill that mailbox with forged deliveries up to the rate limit, so mailbox entropy and the rate limit are the whole guard, and rate-limit hits are the signal that someone is abusing one. A forged payload travels the entire path — deposit, durable buffer, drain, dispatch — and is discarded only on the instance, which pays the delivery cost for garbage. A rejected forgery is still acked, because a frame nobody will ever accept would otherwise hold every later delivery behind it. The relay can report that it delivered a frame and nothing about whether the frame was genuine, so provider-level debugging happens in the instance logs.

The frame also arrives with headers and a path the depositor chose. Anything the instance reads as an internal marker is stripped from a drained frame before dispatch, so a depositor cannot dress a forgery up as a trusted in-process caller.

Future diffs must respect:

- The relay never parses a payload and never checks a sender signature. Provider knowledge stays out of its code and out of its route table.
- A new sender arrives behind the app that declares `api.relayWebhook`, verified on the instance by whoever holds that sender's secret. It never arrives as a relay route or a relay deploy.
- Deposit authorization stays possession of the `mailboxId` plus a rate limit. A deposit credential the relay has to store reopens this record.
- The edge holds only the public half of the minting keypair. No private key and no per-instance secret rests on the relay.
- Whoever consumes a relay frame verifies the sender's signature before acting on it and drops what it cannot verify. At-least-once delivery means that consumer also dedupes.
- Every part of a drained frame is depositor-controlled. Markers the instance trusts are stripped before dispatch, never carried through from the deposit.
- Routing one mailbox to more than one consuming app is outside this record. A second declarer of `api.relayWebhook` needs its own decision.
