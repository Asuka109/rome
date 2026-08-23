import { Args, Command, Flags } from "@oclif/core";
import { createLogger } from "../../../logger.js";
import { getProfileAppDataDir } from "../../../paths.js";
import { uninstall } from "../lib.js";

const log = createLogger("apps-cli");

export default class Uninstall extends Command {
  static override description =
    "Remove an installed app via the running daemon. First-party apps (shipped with Rome, " +
    'including "system") are rejected — disable them instead. Requires `pnpm start`.';

  static override examples = ["pnpm app:uninstall my-app", "pnpm app:uninstall my-app --purge"];

  static override args = {
    appId: Args.string({
      description: "Id of the installed app to remove",
      required: true,
    }),
  };

  static override flags = {
    purge: Flags.boolean({
      description:
        "Also delete the per-app data directory (~/.rome/<profile>/<appId>/) and DB tables. Destructive — defaults off.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Uninstall);
    await uninstall(args.appId, { purge: flags.purge });
    this.log(
      `Removed "${args.appId}"${flags.purge ? ` (purged data at ${getProfileAppDataDir(args.appId)})` : ""}.`,
    );
    log.info("uninstall complete", { appId: args.appId, purge: flags.purge });
  }
}
