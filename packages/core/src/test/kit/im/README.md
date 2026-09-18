# IM API fixtures

Real-platform API capture: [IM API tracing](../../../../../../docs/observability/im-api-tracing.md). Use reviewed, synthetic captures to extend these modeled contracts.

These fixtures run local HTTP and WebSocket peers behind the production SDKs. They test serialization, message identity, edits, polling, gateway events and delivery failures without platform accounts. Rome adapters, connection grants, pairing admission, scheduling and SQLite repositories remain real in the scenario tests.

Run from the repository root:

```sh
pnpm test:im
```

The files use `.integration.test.ts`, so `pnpm test:integration` and its CI job include them. Fast assembler and scheduler tests remain in the unit suite.

## Supported contracts

| Fixture | Real client | Modeled protocol |
| --- | --- | --- |
| `DiscordApiFixture` | discord.js 14.26.2 | Gateway discovery, HELLO/IDENTIFY/READY, heartbeat ACK, basic RESUME, MESSAGE_CREATE, bot identity, DM/channel lookup, create/read/edit messages, multipart uploads, command registration |
| `LarkApiFixture` | @larksuiteoapi/node-sdk 1.68.0 | Tenant token, bot identity, WebSocket discovery, binary pbbp2 events/ACK/ping/pong, create/reply/read/update messages, reactions |
| `TelegramApiFixture` | grammy 1.40.0 | Bot identity, webhook deletion, HTTP long polling, create/edit messages, multipart media sends, typing/callback acknowledgments |
| `WechatApiFixture` | Rome's ilink HTTP adapter | Polling, context-bound text/media sends, typing tickets, encrypted uploads, API-level and HTTP failures |

Payload builders live next to each route implementation. They contain synthetic identities and wire fields taken from the installed SDKs and the production adapter. This keeps executable samples and modeled responses together. Upgrading an SDK requires rerunning this suite and reviewing new or changed requests.

Protocol references: [Discord Gateway](https://discord.com/developers/docs/topics/gateway), [Discord messages](https://discord.com/developers/docs/resources/message), [Lark messages](https://open.larksuite.com/document/server-docs/im-v1/message/create), [Lark SDK](https://github.com/larksuite/node-sdk), and [Telegram Bot API](https://core.telegram.org/bots/api). WeChat fixtures follow the request and response shapes in `src/channels/wechat.ts`, without assuming Telegram-style message receipts.

## Script a scenario

```ts
const fixture = await new DiscordApiFixture().start();
const adapter = fixture.createAdapter();
const barrier = requestBarrier();
try {
  await adapter.start();
  fixture.server.once({
    method: "POST",
    path: `/api/v10/channels/${DISCORD_DM}/messages`,
    before: barrier.wait,
  });
  const pending = adapter.createText(DISCORD_DM, "hello");
  await barrier.entered;
  // Inject additional model output, Stop, or a grant revocation here.
  barrier.release();
  const receipt = await pending;
  expect(fixture.messages.get(receipt.messageId)?.content).toBe("hello");
  fixture.server.assertClean();
} finally {
  barrier.release();
  await adapter.stop();
  await fixture.close();
}
```

`server.once` consumes one matching request. `response` refuses or rate-limits it without applying the normal route. `dropAfterAccept: true` applies the route and closes the socket before returning a response. This models a message that exists remotely while Rome can only record an unknown result. Combine `before` with either outcome to control races.

`waitForCall` waits for a matching recorded request with a bounded timeout. Include `call.completedAt` when waiting for the route to finish. A recorded request is not by itself delivery success. `accepted` means the fixture applied a mutation. It does not imply that the SDK received the response or that a person saw the message.

Use barriers and recorded operations to order tests. Do not sleep to guess when a create or edit has reached the provider. Native SDK timing checks, such as Retry-After, run on the real clock. The existing unit fixtures cover virtual-clock scheduling.

## Isolation and cleanup

Each peer binds a random port on `127.0.0.1`. Injected HTTP clients reject foreign origins and redirects. Unmodeled routes produce an error, and `assertClean()` fails on unexpected routes or unused fault scripts. Authentication headers are omitted from logs. Secret/token fields and Telegram token paths are redacted.

Use local files for attachment inputs. Arbitrary remote attachment downloads are outside this fixture contract. In particular, discord.js can fetch an attachment URL independently of its REST client. These helpers are not a process-wide network sandbox.

Stop the adapter or registry before closing the peer. Close aborts held HTTP requests, terminates WebSocket peers, and rejects pending request waiters. Release barriers in `finally`. Keep WeChat state in a disposable directory. Its injected transport preserves the production URL validation and maps only its expected API origin to the local peer.

Lark uses real Feishu/Lark domains when constructing SDK requests, then rewrites them at the guarded HTTP boundary. The SDK path-parameter interpolator treats a port in a custom domain as a parameter, so supplying a loopback URL directly as its domain is not equivalent. The protobuf codec implements only the fields used by these scenarios and is checked against the real SDK's encoder and decoder through network tests.

Telegram's HTTP fixture exercises grammy's multipart serialization, unlike the faster existing `FakeTelegramApi` transformer fixture. Its fetch bridge adapts grammy's Node AbortSignal and streaming bodies to native fetch.

## Acceptance and limits

The suite covers progressive overflow parts, later commentary/final output, Stop during create, ordinary split/attachment pacing, partial receipts, SQLite recording failure, uncertain creates/edits, revocation, Discord route/global 429 handling, and Telegram/Lark pairing admission. Input queue startup, deferred/unknown steering, backend continuations, Envoy and WebChat retain their existing regression tests.

This is a protocol subset, not an emulator for every platform feature. Unknown APIs must be added explicitly. Full gateway resume replay, complete card schemas, arbitrary CDN downloads, and vendor-wide quota policies are not modeled. The fixtures do not add Lark streaming delivery. Live-account checks remain necessary to verify real permissions and platform behavior.
