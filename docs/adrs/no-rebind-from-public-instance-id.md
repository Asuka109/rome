# An instance is whoever holds its durable token: the public instance id never re-binds one, and revoke is terminal

- **Status**: Accepted
- **Date**: 2026-08-11
- **Concept**: [Rome Cloud — Instance sign-in](../concepts/rome-cloud.md#instance-sign-in)

## Context

A Rome instance is one running deployment registered under one cloud account. The account is the unit of ownership and billing, and it is the only thing a human logs into. The instance is the unit of action and failure: it mints its own relay mailbox, hits its own rate limit, and gets lost, stolen, or decommissioned on its own. One account holds several of them, and a self-installed box starts fully local and anonymous with no credential at all.

Two identifiers come out of registration, and they travel to different places. The durable instance token is a secret the machine holds locally. A provisioned box receives it in its environment and seeds it into its own store at boot. A self-installed box mints it through a browser consent flow and writes it to that same store. The `instanceId` is a public handle that appears in the "your instances" list, in logs, in the instance's own diagnostics panel, and on the admin and revoke paths. A handle that appears in a dashboard and a log line is readable by anything that can read a dashboard or a log line.

Account authentication is not a statement about any one instance. Anyone who reaches the account surface — including an attacker holding a phished dashboard session — can read the ids of every instance under that account. So an attacker who has stolen nothing from the target machine satisfies a check of the form "this session owns the account, and it named an id that belongs to the account".

The durable token reaches exactly one relying party. The instance presents it to [Rome Cloud](../concepts/rome-cloud.md), and Rome Cloud brokers the per-service credential a service actually verifies. A service edge never sees the durable secret. That confinement is what keeps the later upgrade to hardware proof-of-possession a change to two functions rather than a change to every service.

Revoke exists for lost, stolen, decommissioned, and compromised machines. Its whole job is to make a machine stop being that instance while the account and the sibling instances carry on untouched. A machine that is already running never asked to be revoked, so the revoked state also has to reach a box in the middle of a session.

The industry default for a device credential runs the other way on all three points. A device registers, receives a rotating or refreshable credential, and reclaims its record by re-registering against a known device id, and revoke is a reversible credential reset the owner can undo. That default has already been proposed here: an earlier draft of this same design matched re-auth on `(account, instanceId)`.

## Decision

An instance is whoever holds its non-rotating durable token, and that token is presented only to Rome Cloud. No path re-binds an existing instance row from the public `instanceId`, and a revoke tombstones the row and burns the id for good.

## Alternatives

- **Match re-auth on `(account, instanceId)` so a machine that lost its token resumes its existing row.** Rejected because a public id proves nothing about who holds the machine, so any session that authenticates to the account — a phished one included — reclaims a sibling instance by quoting the id the instances list already shows it.
- **Let the registering app name the account it wants to bind to.** Rejected because a client-asserted identifier is the same class of proof as a quoted public id, and the binding has to come from the browser session where a human approved it.
- **Rotate or refresh the durable credential on a schedule, as a device credential normally does.** Rejected because a rotation exchange the client can miss — an offline box, an interrupted write to the local store, a restore from an older snapshot — locks out a machine that still holds a valid secret. The only recovery for that lockout is re-binding by id, which this record forbids.
- **Treat revoke as a reversible credential reset the owner can undo.** Rejected because every intent that justifies the button is a finality intent: a lost, stolen, or decommissioned machine has to stop being that instance for good, and a revoke the holder can undo is a reset wearing a kill-switch label.
- **Free the `instanceId` for reuse after revoke.** Rejected because a reused handle collapses the audit trail: log lines, mailbox lookups, and admin actions from either side of the revoke resolve to one id, so the tombstone stops being readable.
- **Reuse the per-account `rome_` token as the instance credential.** Rejected because one token per account puts full account powers on an end-user machine, revoking one compromised machine rotates the credential out from under every other machine, and no call can be attributed to the instance that made it.
- **Share one account identity across all of a user's instances, with no per-instance credential.** Rejected because per-instance state keyed by that identity collapses onto one row, so every instance under the account resolves to a single relay mailbox and the instances steal each other's deliveries.
- **Present the durable token to each service edge and let the service verify it.** Rejected because the durable secret then rests in every service's trust domain, which multiplies the places it can be stolen and fans the hardware-key upgrade out to every service that learned to verify it.
- **Make the recurring check load-bearing for staying connected, by re-brokering the service credential on every tick.** Rejected because that puts Rome Cloud on the continuous path for every healthy instance, so an outage of the identity service disconnects all of them after one interval. The recurring check earns its place only as a demotion path: it removes a credential Rome Cloud has disowned and mints nothing.
- **Prove possession of a non-exportable hardware key instead of holding a bearer secret.** Deferred rather than rejected, because it puts Secure Enclave key generation and per-service proof-of-possession verification ahead of the first consumer of the credential. The confinement rule above is what keeps that upgrade cheap.

## Consequences

Losing the token needs no recovery protocol. A wiped disk or a fresh install registers as a new instance with a new id and a new token, which is a visible new entry in the instances list rather than a silent resumption. A stolen token compromises one instance and revokes in isolation. The public id can be printed anywhere a human or a log wants it, because it carries no authority and grants nothing. An enrollment attempt from a box that already holds a live token is refused outright. A box whose token Rome Cloud rejects starts over as a new instance instead of reclaiming the old row.

The durable secret stays on one leg of the system. Account-scoped mail, the Rome Cloud OAuth surface, connection brokering, app publishing, the upgrade check, and the central push broker all address Rome Cloud itself with that token. The webhook relay is reached over an edge Rome Cloud does not serve, and it verifies the short-lived `drainKey` Rome Cloud brokers rather than the durable secret.

A revoked instance discovers the tombstone by itself. The box re-presents its durable token to Rome Cloud on a recurring check, every fifteen minutes by default. A terminal answer — a tombstoned instance, or a token Rome Cloud does not know — makes it delete the local credential. Deleting it flips the box back to un-enrolled and routes the dashboard to the connect flow, so a mid-session revoke lands within one interval. The check only ever takes a credential away. It mints nothing, refreshes nothing, and treats an unreachable Rome Cloud as a no-op, so an outage of the identity service never signs a healthy instance out.

The costs land on recovery and on ghosts. A user whose machine dies gets a new instance and a new mailbox, so someone has to repoint by hand any webhook producer aimed at the old deposit URL. A mistaken revoke costs a full re-registration with a human in the browser, because nothing un-revokes. Involuntary loss leaves a row nobody can clean up automatically, so the dashboard `lastSeen` timestamp and the revoke button are the only cleanup. The boot announcement and the recurring check are what feed that timestamp. A non-rotating token stays valid until someone revokes it, which makes per-instance attribution and `lastSeen` the detection surface for a leak.

Future diffs must respect:

- Possession of the durable token is the only way to act as an instance. No public identifier, account session, hostname, or hardware fingerprint substitutes for it.
- No endpoint resumes, re-binds, or re-issues credentials for an existing instance row from an `instanceId`. A machine without its token registers anew.
- The durable token is presented only to Rome Cloud. A service that starts verifying it directly reopens this record.
- Revoke is terminal, and the revoked `instanceId` is never reissued. An un-revoke path, an idle auto-revoke that a client can reverse, or an id recycler each need their own decision.
- The `instanceId` stays a name and never a capability. It is never the deposit URL and never a substitute for the opaque `mailboxId` that authorizes a deposit.
- The recurring identity check may only drop a credential Rome Cloud has rejected. A tick that mints, refreshes, or re-brokers a credential, or that treats an unreachable Rome Cloud as terminal, puts the identity service on the continuous path for every healthy instance.
