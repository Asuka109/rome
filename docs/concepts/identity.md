# Identity: Guardian, Visitor & Persons

## Guardian

The guardian is the single human user that a Rome instance serves. They control all configuration, memory, and policies. The guardian's profile (name, timezone, preferences) is stored in [memory](data.md#memory).

**Contracts:**

- One Rome instance serves exactly one guardian. There is no multi-guardian mode.
- The guardian is always the highest-trust [bond level](#bond-levels). No person can outrank them.
- Only the guardian can approve or reject an [approval-gated action](messaging.md#approvals).
- The guardian's full access is inherent. Every other authenticated identity is a [visitor](#visitor) whose access is granted and revocable.

**Not to be confused with:**

- **[Person](#persons)** — a person is someone the guardian knows. The guardian is the one the instance serves.
- **[Visitor](#visitor)** — a visitor holds scoped access the guardian granted. The guardian owns the instance and can never be outranked by one.
- **The agent's identity** — the agent has its own name and personality, stored separately from the guardian's profile.

## Visitor

A visitor is the holder of a [Rome Cloud](rome-cloud.md) account that the guardian has granted scoped access to. A visitor authenticates by signing in to that account — the sign-in flow and its edge enforcement live in [access control](../architecture/access-control.md).

**Contracts:**

- A visitor reaches only the surfaces its email is allow-listed for: individual access-gated apps, or the full dashboard when the guardian keeps a dashboard allow-list. A visitor can never hold guardian privileges.
- The visitor's email is authoritative from the Rome Cloud sign-in exchange. Nothing the browser supplies can set or change it.
- Every request re-checks allow-list membership, so removing an email revokes access immediately rather than at the next sign-in. The email comparison is case-insensitive.

**Not to be confused with:**

- **[Guardian](#guardian)** — the guardian owns the instance and holds full access. A visitor holds scoped access the guardian granted.
- **[Person](#persons)** — a person is someone the guardian knows, carrying a bond level. A visitor is an authenticated caller, and the two are orthogonal — a visitor need not be a tracked person.

## Persons

Rome tracks people the guardian knows. Each person carries a [bond level](#bond-levels) that determines how the system interacts with them, and can be linked to multiple platform-specific identities (a Telegram user ID, a WhatsApp number), so the system recognizes the same person across [channels](messaging.md#channels).

**Contracts:**

- A person's identity is channel-independent: multiple platform identities resolve to the same person, and what the system knows about them travels with the person, not the platform account.
- Every person carries exactly one [bond level](#bond-levels).

**Not to be confused with:**

- **[Guardian](#guardian)** — the guardian is served by the instance. Persons are known to it.
- **Platform identity** — a per-channel account (Telegram user ID, WhatsApp number). A person aggregates one or more of these.

## Bond levels

A bond level is the trust tier assigned to a [person](#persons). It determines how deeply the system remembers them and whether their messages are trusted by default.

| Level | Examples | Memory depth |
|---|---|---|
| Guardian | You | Full profile |
| Inner circle | Family, close friends | Detailed profile |
| Acquaintance | Colleagues, contacts | Moderate profile |
| Other | Everyone else | Name only |

**Contracts:**

- Bond level drives the default routing for a sender's messages: trusted levels route direct to the main agent, and everyone else goes through [sentinel](messaging.md#sentinel) triage. By default only the guardian is trusted. Which levels count as trusted is configurable.
- [Policies](messaging.md#policies) can override the default routing per sender, thread, or channel.
- The guardian tier is fixed as the highest-trust level.

**Not to be confused with:**

- **[Policy](messaging.md#policies)** — a bond level is an attribute of a person. A policy is a routing rule that may key on bond level (among other things).
