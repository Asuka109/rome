# Guest networking runs in host userspace, never over a vmnet bridge

- **Status**: Accepted
- **Date**: 2026-08-11
- **Architecture**: [desktop runtime](../architecture/desktop-runtime.md)

## Context

The [macOS desktop runtime](../architecture/desktop-runtime.md) hosts the Rome backend inside a Linux VM, and that guest reaches the internet for most of what it does. Model API calls, container image pulls, package installs, and browser automation all leave the guest. A guest whose outbound path fails is a desktop app that never finishes onboarding.

Many guardians run a host-side TUN proxy: Loon, Clash, Surge, or a full-tunnel VPN. Such a proxy claims the host default route and terminates TCP rather than forwarding packets transparently. A guest attached to a kernel-level vmnet bridge arrives on that route as a separate machine with a foreign source address. The proxy drops that traffic, and nothing downstream can rebuild the return path. The guardian gets a dead network, not a slow one.

The break is architectural rather than a matter of configuration. Host packet-filter SNAT rules, per-proxy bypass entries, and orchestrator-level socket publishing each leave the return path unreconstructable. The failure follows the guest's separate network identity, so any fix that keeps that identity inherits the failure.

The industry default pulls the other way. A Mac VM guest normally gets a kernel-level bridge at close to line rate, and Apple's own `container` CLI carries the virtualization entitlement for free under Apple's signature. Moving off that path means re-signing a third-party orchestrator under Rome's own Developer ID and living with a lower throughput ceiling.

The workload sets how much that ceiling costs. Rome's guest traffic is HTTP and WebSocket to the model API plus image pulls. The bulk state the host and the guest share is Rome's home directory, and it crosses on a shared filesystem mount rather than over the network.

## Decision

Guest outbound traffic traverses a userspace network stack running as a host process, so it leaves the machine as ordinary host-process socket calls that a TUN proxy treats exactly as it treats Safari's. A runtime provider that wires the guest to a vmnet bridge does not conform, as recorded in the [desktop runtime invariants](../architecture/desktop-runtime.md#invariants).

## Alternatives

- **Bridge the guest onto the host network with vmnet, the default for a Mac VM.** Rejected because a bridged guest carries its own source address onto the host default route. A TUN proxy on that route drops the traffic and cannot rebuild the return path, which leaves every affected guardian without a working runtime.
- **Keep the vmnet bridge and repair the path on the host with packet-filter SNAT or proxy bypass rules.** Rejected because the repair lives in configuration Rome neither owns nor can verify. Each proxy speaks its own dialect of bypass rule, and none of the combinations tried restored the return path.
- **Keep the vmnet bridge and ask the guardian to turn the proxy off while Rome runs.** Rejected because the proxy is a machine-wide posture the guardian chose deliberately. Rome may not make its own runtime conditional on disabling the network the rest of the laptop depends on.
- **Select vmnet by default and fall back to a userspace stack when a TUN proxy is detected.** Rejected because proxy detection is a heuristic over a surface that shifts with every proxy release. A wrong verdict produces a silently broken guest network, and both paths would then need exercising against every network change.
- **Stay on Apple's `container` orchestrator so the virtualization entitlement stays Apple-signed.** Rejected because that entitlement arrives bundled with vmnet as the only guest network model. One saved signing step costs the whole proxy-using population a usable product.
- **Add a vmnet interface later to lift the throughput ceiling.** Rejected because it reintroduces the same dead network for every proxy user, in exchange for headroom no current workload consumes. A workload that needs line rate has to solve the return-path problem first rather than trade it away.

## Consequences

The guest inherits the host's network posture instead of carrying one of its own. A guardian behind a TUN proxy configures nothing, and support reasons about one path instead of two. Whatever a proxy does to the host's own applications it does to Rome, so a registry that drops a connection mid-pull is a retryable fault rather than a dead guest network. Guest DNS resolves through the host's own resolution path, which keeps fake-IP DNS from an active proxy working inside the guest. The guest never appears on the host LAN, so Rome opens no LAN-visible address for its backend.

The costs land in throughput and in signing. A userspace stack sits below vmnet's line rate, and the [known limits](../architecture/desktop-runtime.md#known-limits) carry that ceiling. Rome re-signs a third-party orchestrator binary under its own Developer ID and self-claims the virtualization entitlement. That re-signing has to land before the app bundle is sealed, because signing a nested binary after notarization invalidates the ticket the release ships with. Diagnosing a network fault means reading the host orchestrator process and the guest's own container output rather than a kernel bridge.

Future diffs must respect:

- A new `RuntimeProvider` routes guest outbound traffic through a userspace stack on the host. A provider built on a vmnet bridge is not a conforming implementation.
- Guest name resolution rides the same host process as the guest's outbound traffic. A bridge-side resolver reintroduces the split identity this decision removes.
- A throughput complaint gets answered inside the userspace path or by moving the work off the guest. Adding a bridged interface is not an available answer.
- A feature that needs bulk bytes between the host and the guest moves them over the shared filesystem mount. A feature that cannot use that mount states its bandwidth budget against the userspace ceiling before it lands.
- Performance work on the network path keeps guest traffic indistinguishable from host-process traffic at the proxy.
