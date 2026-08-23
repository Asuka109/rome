export type ProviderKind = "lima";

export type RuntimePhase =
  | "checking_host"
  | "installing_runtime"
  | "starting_runtime"
  | "pulling_image"
  | "starting_rome"
  | "waiting_for_health"
  | "ready"
  | "stopping"
  | "failed";

export type RuntimeAction =
  | "install_runtime"
  | "open_runtime_app"
  | "retry"
  | "open_dashboard"
  | "none";

export interface RuntimePullProgress {
  percent: number | null;
  status: string;
  currentBytes: number;
  totalBytes: number;
  layersCompleted: number;
  layersTotal: number;
  /**
   * Coarse lifecycle of the in-flight pull. `downloading` covers blob fetches,
   * `unpacking` covers post-download extract/commit (the long tail after the
   * UI hits 100%), and `done` is set by the pull driver right before returning.
   */
  phase: "downloading" | "unpacking" | "done";
}

export interface RuntimeHostProbe {
  runtimeInstalled: boolean;
  runtimeRunning: boolean;
  detail: string;
  installUrl: string;
}

export interface StartContainerArgs {
  image: string;
  envFile: string;
  rootDir: string;
  /**
   * Absolute host filesystem path where the runtime should publish the
   * container's HTTP listener as a Unix domain socket. Providers MUST keep
   * this path off vmnet so host-side TUN proxies cannot intercept it.
   */
  socketPath: string;
  /**
   * Absolute host filesystem path bind-mounted into the container as
   * /home/rome so the entire Rome user home — per-profile state under
   * .rome/ plus any CLI login state (claude-code's .claude/, codex's
   * .codex/, gh's .config/gh/, .gitconfig, …) — survives container
   * removal and image upgrades.
   */
  homeDir: string;
  /**
   * If true, providers must tear down any existing container and start a
   * fresh one. If false (default), providers should reuse a still-running
   * container whose image/env match the requested config, or restart a
   * stopped container in place rather than recreating from scratch.
   * Upgrades set this true since the image just changed underneath.
   */
  forceRecreate?: boolean;
}

export interface RuntimeProvider {
  readonly kind: ProviderKind;
  readonly containerName: string;

  probeHost(): Promise<RuntimeHostProbe>;

  startRuntime(): Promise<boolean>;

  openInstallPage(): Promise<void>;

  imageExists(image: string): Promise<boolean>;

  /**
   * Returns the digest of the locally-stored image (the same value that
   * would appear after `@` in `nerdctl image inspect`'s RepoDigests), or
   * null when the image is not present locally or has no stored digest.
   * Used by the image updater to compare against the registry's current
   * digest for the tag.
   */
  getLocalImageDigest(image: string): Promise<string | null>;

  pullImage(image: string, onProgress: (progress: RuntimePullProgress) => void): Promise<void>;

  /**
   * Best-effort removal of dangling images left behind after an image
   * upgrade. Pulling a new `:tag` over an existing tag in nerdctl leaves
   * the previous image as a dangling `<none>:<none>` entry whose layers
   * stay in the content store; over many upgrades this fills the guest
   * VM disk. Implementations should remove only unreferenced images and
   * must never throw — pruning is a hygiene step that should not be
   * allowed to surface as an upgrade failure.
   */
  pruneDanglingImages(): Promise<void>;

  /**
   * Best-effort removal of the Rome image's other tags, keeping `keep`.
   *
   * Pinned releases each hold their own tag, so nothing ever becomes dangling
   * and `pruneDanglingImages` reclaims nothing — every app update leaves a
   * multi-gigabyte image behind until the guest disk fills and the next pull
   * fails. Implementations must touch only `keep`'s repository and must never
   * throw: reclaiming space is hygiene and cannot be allowed to fail a launch.
   */
  removeOtherImageTags(keep: string): Promise<void>;

  startContainer(args: StartContainerArgs): Promise<void>;

  /**
   * Best-effort graceful stop of the Rome container. Returns once the
   * container is no longer running, or after the provider's internal grace
   * period — never throws. Called during quit so the Rome process inside
   * the VM gets a SIGTERM and a chance to flush state before the VM is
   * torn down.
   */
  stopContainer(): Promise<void>;

  /**
   * Best-effort stop of the underlying runtime (VM / daemon). Returns
   * once the runtime reports stopped, or after the provider's internal
   * grace period — never throws. Called during quit after stopContainer.
   */
  stopRuntime(): Promise<void>;

  collectDiagnostics(): Promise<Record<string, string>>;
}

export interface RuntimeStatus {
  phase: RuntimePhase;
  title: string;
  detail: string;
  primaryAction: RuntimeAction;
  dashboardUrl: string;
  healthUrl: string;
  installDir: string;
  image: string;
  containerName: string;

  provider: ProviderKind;
  runtimeInstalled: boolean;
  runtimeRunning: boolean;
  runtimeInstallUrl: string;

  lastError: string | null;
  pullProgress: RuntimePullProgress | null;
}
