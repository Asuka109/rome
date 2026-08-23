# Desktop Runtime (macOS)

How the macOS desktop shell hosts the Rome backend inside a Linux VM, and the network, signing, and bundling contracts every runtime provider must satisfy. The choice of VM orchestrator is an implementation detail. The invariants below hold for any provider.

## Components

- **Runtime provider** — owns the VM lifecycle. It boots the guest, publishes Rome's socket to the host, and tears the stack down.
- **Loopback proxy** — the sole listener the Electron renderer touches. It forwards every HTTP request and WebSocket upgrade to the provider's Unix domain socket.
- **Bundled guest image** — the complete guest operating system, carried inside the app bundle.

```
Electron renderer ──HTTP/WS──► loopback proxy ──► host Unix socket ──► guest ──► Rome backend
```

## Invariants

- **Guest outbound traffic traverses a userspace network stack on the host.** Rome's traffic leaves the machine as ordinary host-process socket calls. A host-side TUN proxy treats it exactly as it treats any other host application's traffic. A provider that wires the guest to a vmnet bridge is not a conforming implementation. The [decision record](../adrs/user-mode-guest-networking-over-vmnet.md) carries the forces and the rejected alternatives.
- **The Electron renderer reaches Rome only through a host Unix domain socket.** The loopback proxy binds only to the loopback interface, and no TCP port opens on the host LAN for Rome's HTTP and WebSocket traffic. The provider may publish the socket by any mechanism. From the socket onward, the shell treats every conforming provider identically.
- **The support floor is macOS 13 (Ventura) on Apple Silicon.** On a host below the floor, provider selection fails with an explicit error before the shell creates any runtime state. No degraded mode exists.
- **Every Mach-O binary in the app bundle carries a Developer ID signature with the hardened runtime, and the bundle ships notarized.** The rule covers third-party binaries the shell carries: the bundled VM orchestrator ships signed under Rome's own identity, with the virtualization entitlement it needs. Every nested signature is final before notarization, because a signature applied afterwards invalidates the notarization ticket.
- **The guest operating system ships inside the app bundle, never over the network.** First launch boots the bundled guest image as shipped.
- **Durable guardian state survives VM recreation.** The Rome home — the backend's home directory carrying the database, memory, and credential state — lives outside the provider's disposable VM state. VM recreation, reset, and image upgrade all preserve it.

## Known limits

- **First launch pulls the Rome container image.** The guest operating system is bundled, the Rome container image is not. Onboarding blocks on that pull completing over the guest network.
- **The userspace network stack caps throughput below a kernel bridge's line rate.** Rome's traffic profile — model API calls and container image pulls — sits well below the ceiling. The [decision record](../adrs/user-mode-guest-networking-over-vmnet.md#consequences) carries the rules a heavier workload must respect.
- **Provider VM state grows without bound.** The product ships no reset action. Recovery from a diverged VM is manual and removes only the provider's disposable VM state, never the Rome home.
