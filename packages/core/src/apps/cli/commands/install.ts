import { Command, Flags } from "@oclif/core";
import { createLogger } from "../../../logger.js";
import { installAppstore, installLocal } from "../lib.js";

const log = createLogger("apps-cli");

export default class Install extends Command {
  static override description =
    "Install (or re-install) an app via the running daemon. The flag names the source kind: " +
    "--source <repo> builds, packs, and installs from an app source workspace in one step; " +
    "--bundle <dir> installs an already-packed artifact as-is; " +
    "--appstore <listing@version> fetches from the Rome App Store. Requires `pnpm start`.";

  static override examples = [
    "pnpm app:install --source ~/.rome/default/projects/apps/my-app",
    "pnpm app:install --source ./my-app --disabled",
    "pnpm app:install --bundle ./my-app/.rome/artifact",
    "pnpm app:install --appstore xiaohongshu@1.2.0",
    "pnpm app:install --appstore @handle/slug@1.2.0",
  ];

  static override flags = {
    source: Flags.string({
      description:
        "App source workspace (the repo you edit). The daemon runs its build, packs into " +
        "<repo>/.rome/artifact, and installs — the one-step dev loop.",
      exactlyOne: ["source", "bundle", "appstore"],
    }),
    bundle: Flags.string({
      description:
        "Packed artifact directory (e.g. an unzipped App Store bundle, or a prior " +
        "source-mode install's <repo>/.rome/artifact). Installed as-is.",
      exactlyOne: ["source", "bundle", "appstore"],
    }),
    appstore: Flags.string({
      description:
        "Rome App Store reference, <listingId>@<version>. The app id is derived from the " +
        "canonical listing id.",
      exactlyOne: ["source", "bundle", "appstore"],
    }),
    disabled: Flags.boolean({
      description: "Install the app in the disabled state (it will not run until enabled)",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Install);
    const enabled = !flags.disabled;
    if (flags.appstore !== undefined) {
      const { appId, listingId, version } = await installAppstore(flags.appstore, enabled);
      this.log(
        `Installed app "${appId}" from the App Store (listing=${listingId}, version=${version}, enabled=${enabled})`,
      );
      log.info("install complete", { appId, listingId, version, enabled });
      return;
    }
    const mode = flags.source !== undefined ? ("source" as const) : ("bundle" as const);
    const path = flags.source ?? flags.bundle;
    if (path === undefined) {
      // Unreachable: oclif's exactlyOne guarantees one of the three is set.
      this.error("Pass exactly one of --source, --bundle, or --appstore.");
    }
    const { appId, sourcePath } = await installLocal(mode, path, enabled);
    this.log(`Installed app "${appId}" via daemon (${mode}=${sourcePath}, enabled=${enabled})`);
    log.info("install complete", { appId, mode, sourcePath, enabled });
  }
}
