# The store API token is dashboard-issued, environment-only, and never expires

- **Status**: Accepted
- **Date**: 2026-08-11
- **Concept**: [Rome Cloud](../concepts/rome-cloud.md)

## Context

[Rome Cloud](../concepts/rome-cloud.md) runs the [app store](../concepts/apps.md#app-store) backend, and the `rome` CLI publishes a version to it. That publish runs in two places: a developer's shell, and an unattended CI job that nobody is watching. The credential decided here has to work in both. A Rome instance publishes an app it holds through the same store endpoint, and it presents its own instance credential rather than this one.

The dashboard cookie session is the credential the browser already holds. It expires on a fixed calendar, and it carries the full powers of the account — instances, the OAuth broker, admin endpoints. A publish workflow needs neither of those properties. It needs a credential narrow enough to hand to a build machine and durable enough to survive a pipeline that runs once a month.

Issuance is a trust root, and Rome Cloud keeps its trust roots separate. Whoever can mint a credential can extend the account's reach, so the surface that mints the store token decides who can grow that reach. Keeping minting in the browser leaves the developer one recovery path that a stolen token cannot close.

Every place a long-lived secret rests is a place it can leak, and each resting place carries its own provenance. The environment variable is transient and scoped to one process. The login config file holds a short-lived session the CLI minted itself. A third location, filled by pasting a secret the CLI never minted, has neither property.

Rotation still has to exist. The dashboard shows the creation and last-used timestamps and offers reset and revoke, so a suspected leak has an answer that takes effect at once.

## Decision

The store API token is minted only from the Rome Cloud dashboard, reaches the CLI only through the `ROME_TOKEN` environment variable, and stays valid until the developer resets or revokes it from that dashboard.

## Alternatives

- **Persist the token to disk after a login command, the way `gh`, `npm`, `docker`, and `aws` do.** Rejected because a pasted secret written by the CLI has no mint flow behind it, so the file records a credential of unknown origin and keeps it resting there long after the process that needed it exited.
- **Add a `token save` / `token print` subcommand for developers who cannot set environment variables.** Rejected because a print path turns every process that can run the CLI into a read oracle for the secret. The gap it fills — a place an unattended job can read a secret from — is what the CI secret store already covers.
- **Give the token an expiry and a rotation policy, the way personal access tokens do.** Rejected because the consumer is an unattended pipeline with no headless renew path, so an expiry turns a working publish into a 401 on a date nobody chose and leaves no one at the keyboard to fix it.
- **Issue short-lived tokens and refresh them.** Rejected because the refresh credential is itself long-lived and has to rest on the build machine, which returns the durable secret to disk and adds a renewal step that can fail while the job runs.
- **Keep the dashboard session as the CLI credential.** Rejected because it expires while CI sleeps, and it carries authority over instances and the OAuth broker that a store publish never needs.
- **Let the token mint, rotate, or revoke itself through the token-management API.** Rejected because a leaked token could then rotate the legitimate holder out of their own account, which destroys the one recovery path the developer always holds.
- **Ship named, scoped tokens with per-token revocation instead of one token per account.** Rejected because a consumer that needs its own revocation gets its own credential class instead, so named tokens would multiply the issuance UI, the auth path, and the revocation semantics for a single publish flow.

## Consequences

A fresh shell with only `ROME_TOKEN` exported publishes, with no login run and no state on the machine. CI holds the credential where it already holds every other secret. The credential outlives the pipeline that uses it, so a monthly publish never meets a password prompt. Reset is the single rotation primitive, and it takes effect on the next request.

The costs land on recovery and on leak detection. A developer who cannot export an environment variable falls back to the login session, which expires and puts a person back at the keyboard — the one thing an unattended job cannot supply. The plaintext is unrecoverable after issuance, so a lost token means a reset rather than a lookup. A leaked token stays valid until someone resets it, because no expiry backstops the leak. Detection rests on the last-used timestamp in the dashboard and on secret scanning of the token prefix.

Future diffs must respect:

- No CLI subcommand persists, prints, or otherwise writes the store token to disk. The environment variable is the only path that carries it into the CLI. The login command writes a short-lived session to its config file, and that file never holds a store token.
- The token-management endpoints stay callable only with a dashboard session. A store token never authenticates a request that mints, rotates, or revokes a store token.
- The token carries no expiry. A time-to-live, a forced rotation interval, or an idle timeout each reopen this record rather than land as a field.
- The store token authenticates the store API alone. Instance endpoints and the OAuth broker keep their own credentials and their own trust roots. The store API may accept another credential, the way it accepts an instance publishing its own app, but the store token never reaches past the store API.
- A consumer that needs its own revocation gets its own credential class, the way the instance publish path does. Named or scoped store tokens earn a new record before they land.
