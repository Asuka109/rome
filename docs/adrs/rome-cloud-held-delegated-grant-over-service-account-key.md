# Rome Cloud's own provider access is a delegated grant with no handoff, not a service-account key

- **Status**: Accepted
- **Date**: 2026-08-11
- **Concept**: [Rome Cloud](../concepts/rome-cloud.md)

## Context

[Rome Cloud](../concepts/rome-cloud.md) runs the third-party OAuth broker. The broker's job is to run a provider's consent flow on behalf of a Rome instance and deliver the resulting token to that instance's backend. Serving an admin dashboard from a Google-held analytics dataset makes Rome Cloud itself the consumer of a provider API. The broker has no shape for a grant whose consumer is Rome Cloud, so both the credential and its containment are open questions at once.

The industry default for a backend reading a Google dataset is a service-account key in the environment, or workload identity where the backend runs on the cloud provider. Google recommends that path for server-to-server access. It needs no consent flow, no refresh machinery, and no broker change. Rome Cloud already lives with one long-lived, non-expiring secret in the [store API token](env-only-non-expiring-store-token.md), so a second one reads as precedent rather than as a deviation. That is what gives the default its pull here.

The two credential shapes differ in who can end the access and in how much authority it carries. A delegated grant belongs to the consenting Google account, which can revoke it from Google at any moment, and that account's own IAM caps its authority. A service-account key is a standing project identity with IAM of its own, rotated by hand, resting wherever the process reads it from. The broker already stores provider tokens encrypted at rest, already runs PKCE, and already asks for offline access, so the delegated path costs one branch in the broker plus renewal.

A token Rome Cloud keeps for itself lands on the wrong side of Rome Cloud's own containment contract. Provider tokens brokered for an instance never leave that instance's backend, and the [handoff](../concepts/rome-cloud.md#oauth-handoff) is the path that carries them out. The handoff is a single-use code the browser delivers to the instance. The instance spends it as the subject token of a token exchange on the brokering security token service, authenticated by its own instance credential. Without a handoff row there is nothing to spend, so that row is what makes a grant reachable from outside.

Every grant the broker mints exists to travel. A grant meant to stay inside Rome Cloud has to answer the egress question in the same change that introduces it, or it sits in the same store as grants built to leave, separated from them by nothing.

Renewal is the price of holding a grant. Nothing in the brokering chain refreshes a provider token. The broker exchanges the authorization code once. An instance whose bundle expires has no refresh path, so the grant degrades until the guardian reconnects. Re-consent answers well enough when a person is already at the dashboard. A reconciler that runs on an interval has nobody to ask when an access token ages out.

## Decision

Rome Cloud's own access to a third-party API rests on a delegated, user-consented OAuth grant, stored encrypted in the broker's connection store and refreshed by Rome Cloud. A broker session whose target is Rome Cloud mints no handoff, so the grant has no egress path to any instance.

## Alternatives

- **Put a service-account JSON key in the environment, as Google recommends for server-to-server access.** Rejected because a key is a standing bearer credential resting outside the encrypted connection store, with rotation as a manual chore and no revocation the consenting person controls, while the broker that makes the delegated path cheap already exists.
- **Federate an ambient workload identity from the hosting environment instead of holding any secret.** Rejected because Rome Cloud runs its workers outside the cloud provider that issues the identity, so the option buys credential-free access at the cost of moving the deployment or standing up federation for one credential.
- **Request the sensitive scope on the shared login OAuth client, reusing the grant sign-in already produces.** Rejected because a sensitive scope on a published client pulls every user of that client, including plain sign-in, into Google's app verification.
- **Mint a handoff for the Rome Cloud-held grant and let the analytics reader redeem it like an instance does.** Rejected because the handoff row is the artifact the brokering token exchange consumes, so minting one makes the Rome Cloud-held grant redeemable by any caller that can complete that exchange.
- **Keep minting the handoff and guard it, refusing redemption for rows marked Rome Cloud-owned.** Rejected because a guard is a check a later diff can miss or invert, while an absent handoff row leaves the token exchange with nothing to find.
- **Deliver the grant through the Rome-managed connector path that serves agents.** Rejected because that path exists to move tokens to instances for agents to act with, which is the exact movement this grant must not make.
- **Skip renewal and have an admin reconsent when the access token expires, the way an instance-held grant does.** Rejected because a background reconciler runs between admin visits, so an hour-lived token turns every unattended tick into a failure. Re-consent carries the instance path only because a guardian is present to give it.
- **Let each instance hold its own grant and report analytics upward.** Rejected because the dataset is operator-owned and fleet-wide, so the option scatters copies of a credential no instance needs across every instance.

## Consequences

Revocation belongs to the person who consented, and it takes effect at Google rather than through an operator chore. The grant rests in the same encrypted store, under the same lifecycle, as every other connection, so it inherits that store's handling instead of adding a resting place. Scope alone confers nothing, because the token can do only what the consenting account's IAM allows, which keeps a widened scope from silently widening reach. The environment carries only the OAuth client credentials, not the provider's authority.

The costs land on renewal, on availability, and on the person in the middle. Rome Cloud has to refresh tokens, single-flighted, which is machinery no part of the brokering chain carries. A revoked or expired grant becomes a live failure mode that the reader must degrade through rather than crash on. Analytics access is bound to one Google account, so the loss of that person's IAM, or of their consent, stops the dashboard until someone reconnects. A dedicated client kept in a restricted publishing status carries its own operational care.

Future diffs must respect:

- Provider access that Rome Cloud consumes itself is a delegated grant in the connection store. A service-account key, a static provider secret in the environment, or any other long-lived credential outside that store reopens this record.
- A broker session targeting Rome Cloud mints no handoff. Adding one, for any consumer, is a new decision.
- Containment rests on the missing handoff row, not on a filter inside redemption. No diff introduces a way to select a Rome Cloud-held grant for handoff, and the brokering token exchange keeps its existing semantics.
- Instance-target brokering keeps the contract it has. The two targets share the provider adapter and the row shape, never the egress.
- Renewal for a Rome Cloud-held grant stays inside Rome Cloud and stays single-flighted. It confers no refresh path on instance-held grants, which keep guardian re-consent as their renewal.
- A dead grant fails visibly. The reader pauses and surfaces a reconnect path instead of taking the surrounding job down.
- A sensitive scope rides a client dedicated to the flow that needs it. Moving one onto the shared login client is a new decision.
