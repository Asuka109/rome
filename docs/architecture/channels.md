# Channels

How a [channel](../concepts/messaging.md#channels) is connected: the server-owned setup protocol every adapter goes through, and the rules that keep the connect flow generic across services.

## Connection setup

Every channel is connected through **one server-owned setup protocol** ([decision record](../adrs/server-owned-ceremonies-with-terminal-conferral.md)) — not a per-service connect flow. Per-service knowledge (which credentials a channel needs, how it probes them, what the guardian must do) lives in the integration descriptor the server drives. The client only pumps generic setup states and renders them.

### Invariants

- **Setup is uniform.** Enabling any channel drives the same generic surface (a conferral setup addressed by connection + grant). Provider-required codes, such as WhatsApp's phone-link code, are structured setup content. A human account that later messages a Telegram, Discord, or Feishu bot is paired separately at the shared inbound boundary.
- **The dashboard renders setups generically.** The connect UI is a single standard renderer plus a small set of registered custom components for the few steps that need bespoke presentation (e.g. rendering a QR image). Adding a channel adds neither a connect route nor a per-service connect card.
- **Post-connection configuration is not setup.** Config and feature surfaces that operate *after* a channel is linked — Discord per-channel agent routing, the Telegram personal-account dialog list — live under their own named routes, separate from the setup protocol and never part of connecting.

## Human account pairing

Telegram, Discord, and Feishu identify the bot during setup, but do not infer that the first person who messages it is the guardian. An unmapped sender is stopped in the connection Talk router before app hooks, conversations, sentinel, or an agent turn can run. Rome creates one durable, expiring request per channel identity and replies with guardian approval guidance.

The authenticated guardian can approve or reject the request in Settings → Connections. Approval links carry an opaque single-use request token. Self-hosted instances also expose the same approve/reject operation on the loopback-only internal API. Approval maps the exact `(channel, channel_user_id)` to the guardian and resolves the request in one database transaction. Expired, replayed, conflicting, and incorrectly-tokened decisions fail closed. Existing mappings and WhatsApp's provider-owned pairing flow are unchanged.
