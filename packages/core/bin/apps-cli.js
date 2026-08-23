import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execute } from "@oclif/core";

// package.json points oclif at ./src/apps/cli/commands so dev checkouts run
// the TypeScript sources directly (via tsx). Deployed runtimes ship only the
// compiled dist/ tree — there, resolve the same commands from
// ./dist/apps/cli/commands instead of failing every invocation with
// "command not found".
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

if (existsSync(join(packageRoot, "src/apps/cli/commands"))) {
  await execute({ dir: import.meta.url });
} else {
  const pjson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  pjson.oclif = { ...pjson.oclif, commands: "./dist/apps/cli/commands" };
  await execute({ loadOptions: { root: packageRoot, pjson } });
}
