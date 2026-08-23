# Brokering gets its own token endpoint, not another grant on the identity AS

- **Status**: Accepted
- **Date**: 2026-08-11
- **Concept**: [Rome Cloud — OAuth handoff](../concepts/rome-cloud.md#oauth-handoff)

## Context

[Rome Cloud](../concepts/rome-cloud.md) plays two roles for one instance. As an authorization server it asserts who the guardian is, minting the `id_token` and the durable instance credential over [`/oauth2/*`](../concepts/rome-cloud.md#instance-sign-in). As a broker it runs the consent dance with GitHub, Slack, or Google, then hands the resulting provider tokens to the instance that asked for them.

The two roles differ on all three parts of a token exchange. The caller identity differs. The identity endpoint authenticates no client, and its whole caller check is possession of a PKCE verifier the instance minted and kept. The brokering endpoint demands the durable instance token as a bearer credential on the back channel. The input differs: an authorization code issued against Rome's own scopes, against a single-use handoff code that stands for another company's consent. The output differs most of all: a Rome identity assertion, against a secret issued by another company and valid in that company's trust domain.

The identity token endpoint is the login path and the enrollment path at once. Sign-in has no second route, and the same endpoint mints the durable instance credential when the request carries the enrollment scope. A guardian who cannot sign in cannot reach the dashboard to repair anything else. Whatever else that endpoint carries inherits that blast radius.

The local convention pulls the other way. The identity surface holds "two endpoints, parameterised — not one per flow-variant" as an invariant, so `scope` selects between a login assertion and an enrollment. Read past its scope, that rule reads as an argument for hanging brokering off the same path.

The industry default pulls the same way. [RFC 8693](https://www.rfc-editor.org/rfc/rfc8693) defines token exchange as a `grant_type` on the authorization server's token endpoint, and ordinary OAuth practice gives one authorization server one token endpoint that multiplexes grants. A competent contributor adds `grant_type=urn:ietf:params:oauth:grant-type:token-exchange` to `/oauth2/token` and stops. That default has been headed off once already: the identity surface's own design had to reserve brokering in writing as a separate security token service with a different trust root, because folding it in was the obvious move at the time.

The brokering side keeps growing. It carries one grant today, the exchange of a handoff code for the provider tokens. Short-lived downscoped minting, per-instance grant rows for independent revocation, and central [RFC 7009](https://www.rfc-editor.org/rfc/rfc7009) revocation are each a later decision, and each one is a new grant or route on whichever surface wins here.

## Decision

Brokering is its own RFC 8693 security token service with its own token endpoint, `/connections/token`, authenticated by the instance token. The identity authorization server's `/oauth2/token` never gains a brokering grant, and the two surfaces share implementation helpers as libraries rather than sharing a route.

## Alternatives

- **Add `grant_type=token-exchange` to `/oauth2/token`, the way RFC 8693 describes.** Rejected because one path would then decide from request parameters whether to return a Rome identity assertion or a third-party secret, which turns every parameter-validation slip into a grant-confusion bug on the endpoint every sign-in depends on.
- **Keep one token endpoint and separate the two flows by `scope`, as the identity surface separates login from enrollment.** Rejected because `scope` separates flows that share a trust root and an authentication scheme, and these two do not. The endpoint would have to accept both a PKCE code and a Bearer instance token before it could read the scope that was supposed to tell them apart.
- **Fold provider consent into the front-channel `/oauth2/authorize`.** Rejected because that endpoint is the authorization server speaking for the guardian's Rome account, while provider consent is Rome Cloud acting as a client of somebody else's authorization server. One path would leave the browser and every later reader unable to tell whose authority a redirect carries.
- **Let the handoff code alone authorize redemption, with no instance token on the back channel.** Rejected because the handoff is a bearer artifact that travels through a browser, so a leaked URL would be enough to collect the provider tokens, and the caller of the brokering leg would keep having no first-class identity.
- **Keep Rome Cloud's bespoke `/start` and `/redeem` endpoints and their cloud-versus-loopback discriminator.** Rejected because deployment mode decided which code path ran, which is two implementations of one flow that drift apart, and the redemption leg carried no caller identity to build the separation on.
- **Separate the paths and duplicate the shared primitives, so the two surfaces share no code at all.** Rejected because the hazard being separated is grant confusion on a single route, not shared arithmetic, and two copies of PKCE verification, single-use code consumption, and instance-token verification drift in exactly the places where drift is a vulnerability.
- **Multiplex now and split later, once short-lived minting or per-instance grants actually need the separation.** Rejected because the split would then cost a second client migration plus a deprecation window on the login-critical endpoint, and a shared endpoint accumulates callers faster than the reasons to split it accumulate.

## Consequences

Each leg evolves at its own rate. Every later brokering grant — short-lived downscoped minting, per-instance grant rows, central revocation — lands on the brokering security token service, and the endpoint every sign-in depends on stays untouched. Disconnect on an instance deletes only the token bundle that instance holds, so revoking the grant Rome Cloud holds is a decision waiting on the brokering surface. An outage, a rate limit, or a compromise on one leg does not implicate the other. Because the instance token, not deployment mode, identifies the caller, cloud and self-hosted instances run byte-identical broker code.

The costs are duplication and upkeep. There are two token endpoints to document and two authentication paths to keep verified. The brokering leg borrows the RFC 8693 grant name, then carries a Rome-private handoff token type in a JSON body. Conformance on that endpoint is an obligation rather than a fact. The same holds for the library sharing: the identity legs take their PKCE helpers from the shared `@rome-os/libs` package, and the brokering client keeps a second copy of the same arithmetic.

The `/.well-known/openid-configuration` document describes the identity authorization server only, and advertises the single `authorization_code` grant. The brokering surface needs its own discovery story or an out-of-band contract.

Reviewers have to hold the line against the local parameterise-the-token-endpoint convention, which is scoped to one authorization server and does not reach across two.

Future diffs must respect:

- A grant whose output is a third-party credential never mounts on `/oauth2/token`. A grant whose output is a Rome identity or instance credential never mounts on `/connections/token`.
- Every back-channel brokering leg authenticates with the instance token. No deployment mode or tenant slug selects the code path, and the callback origin the instance states on the front channel is a return address, never caller identity.
- Sharing between the two surfaces is by library — PKCE, single-use codes, instance-token verification — and never by route.
- New brokering capability extends Rome Cloud's `/connections` surface. Revocation, listing of the grants Rome Cloud holds, and any change to who holds the refresh token are decisions there, not on the authorization server and not on the instance's own connections API.
- Provider consent stays out of `/oauth2/authorize`. A proposal to move it there reopens this record.
