import { Command } from "@oclif/core";
import { getProjectRoot } from "../../../../paths.js";
import { deriveCoreRequiredApps } from "../../../core-required.js";

export default class ListRequired extends Command {
  static override description =
    "Print the app ids that core agents declare as required, one per line — the set boot " +
    "asserts is present among the packed first-party artifacts (boot installs ALL packed " +
    "first-party apps; this derived set is the assertion input, not the install driver). " +
    "Daemon-independent; derived from agent YAML files.";

  static override examples = ["pnpm app:list:required"];

  async run(): Promise<void> {
    const ids = await deriveCoreRequiredApps({ projectRoot: getProjectRoot() });
    for (const id of ids) {
      this.log(id);
    }
  }
}
