---
name: app_remix
description: Create a new Rome app from the complete published bundle of an installed App Store app whose local app.yaml enables includeSource. Use when the user asks to remix, fork, or customize an installed app. Never edit or overwrite the source app.
tools: [Read, Edit, Bash]
---

# App Remix

Create an independent source repository from an installed App Store app. The prompt must name the installed source app id, the target scoped name, and the target local app id.

## Invariants

1. Treat the source app as read-only.
2. Use `system:app_management` for the copy. Do not download, extract, or copy the bundle with shell commands.
3. Use the target local app id from the prompt. Do not invent another id.
   It must be the scoped name flattened for local paths (`@ray/calendar` →
   `ray-calendar`, with underscores changed to hyphens).
4. Keep every file in the published bundle root. Do not assume the app has a `src/` directory.
5. Keep the source version. Change it only when the user's requested work needs a new release version.
6. Isolate runtime artifact names and database storage before installation. The source app remains
   installed, so the two apps must coexist without shared registry names or tables.
7. Create an independent Git history before applying the user's requested product changes.

## Create the source tree

Call `system:app_management` once:

```jsonc
{
  "op": "create",
  "appId": "<target-local-app-id>",
  "name": "<target-scoped-name>",
  "from": { "appId": "<installed-source-app-id>" }
}
```

Stop if the action fails. Do not work around an `includeSource` rejection, a bundle integrity error, or a destination conflict. Ask the user to choose a different target name when the target id already exists.

Use the returned `rootPath` as `$REPO`. Confirm that `$REPO/app.yaml` has the target id and a `remix` block naming the source listing and version.

Core performs the deterministic part of identity isolation while copying:

- declared action, agent, and skill names receive the target app namespace (`ray-calendar` →
  `ray_calendar__<source-name>`);
- structured agent references (`tools`, `actions`, and `allowedSubagents`), artifact `publicName`
  values, aliases, and suggested channel bindings follow that mapping;
- `db.tablePrefix`, when present, becomes the target app id with hyphens changed to underscores.

## Finish identity isolation

Do this before the baseline commit. Core cannot safely rewrite free-form source code or regenerate a
database migration without the app's own toolchain.

### Runtime artifacts

1. Read every declared action, agent, and skill config and record the names Core assigned.
2. Find semantic references to the old names in source code, API/web calls, prompts, tests, and
   configuration. Update only references that invoke or route to an artifact owned by this app.
   For `formatVersion: 2`, every resulting reference must use
   `<target-local-app-id>:<core-assigned-local-name>`, including same-app references; never leave a
   bare name or emit `self:<name>`. Common shapes include `runAction("<canonical-id>")`,
   `read_skill` instructions, an `agentName` field, and app-authored routing defaults.
3. Do not globally replace strings. The same text may be user-facing copy, stored data, or the name
   of an action owned by another app.
4. Ensure no action, agent, or skill keeps the source app's globally registered name.

### Database

When `app.yaml` declares `db`:

1. Confirm `db.tablePrefix` is the target namespace (for example, `ray_calendar`).
2. Update the app's Drizzle schema/config so its default and generated physical table names use that
   namespace. Runtime repositories must continue to use the `tablePrefix` supplied by the app
   context.
3. Remove only the copied remix's old migration SQL, journal, and snapshots. The new app has no
   migration history or data to preserve; never touch the installed source app's files or tables.
4. Run the app's existing `pnpm db:generate` workflow to create a fresh initial migration from the
   current schema. Do not hand-edit or search-and-replace copied SQL.
5. Inspect the generated SQL and snapshots. They may reference only `<target-prefix>__*` and
   `__drizzle_migrations_app_<target-prefix>`, never the source prefix.

Stop and ask the user if the copied app does not contain enough schema/configuration to generate a
fresh migration baseline. Do not install a database-backed remix with copied source migrations.

## Establish the baseline

1. Add a `.gitignore` when the bundle does not carry one. Ignore `.rome/`, `node_modules/`, and generated build output.
2. Run `git init` in `$REPO`.
3. Build and test the identity-isolated source, then commit it as `Remix <listing>@<version>`.

This first commit is the comparison point for every user-requested change. It includes only the
mechanical identity isolation above; do not combine it with the requested customization.

## Apply the user's changes

Read [`../app_creation/AUTHORING.md`](../app_creation/AUTHORING.md) before editing. Use [`../app_creation/REFERENCE.md`](../app_creation/REFERENCE.md) for manifest and SDK details.

Implement only the request after `I want to add`. Keep the copied product behavior unless the user
asks to change it. Do not globally replace the source app id in code. Component ids and unrelated
package metadata may stay stable, but action names, agent names, skill names, and database
namespaces must remain isolated from the installed source app.

Commit the requested change with its authoring note before installation.

## Install and verify

Install from the new source repository with `system:app_management`:

```jsonc
{
  "op": "install",
  "source": { "mode": "source", "path": "<absolute $REPO>" }
}
```

The returned app id must equal the target local app id. The source app must remain installed under
its original id. Treat `REMIX_ARTIFACT_CONFLICT`, `REMIX_DB_NAMESPACE_CONFLICT`, and
`REMIX_DB_MIGRATIONS_NOT_ISOLATED` as identity-isolation failures: fix the derived source tree and
retry; never disable, uninstall, or modify the source app to bypass them.

Smoke-test the requested behavior. Then call `system:summon` with `agentName: "assistant:assistant"` and tell it to load `coding:app_verification`. Pass the target app id, `$REPO`, the original request, the expected happy path, and the local dashboard or API address. Include its verdict and evidence in the handoff.
