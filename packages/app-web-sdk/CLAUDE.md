# `@rome-os/app-web-sdk`

The web runtime SDK apps import, plus the `rome` CLI (`bin/rome.js` → `src/cli/`): `dev` and `build` for the app web bundle, and the Rome App Store commands `login`, `whoami`, and `publish` under `src/cli/store/`.

## Traps

**The store commands talk to a service, and the user-facing name is the store.** CLI output, help text, and docs say "Rome App Store", never the name of the service hosting it. Nothing checks this.
