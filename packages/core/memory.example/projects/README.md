# Project Memory

`memory/projects/` mirrors project names under `~/.rome/<profile>/projects/` on a best-effort basis.

- A project named `~/.rome/<profile>/projects/<project-name>` should use `memory/projects/<project-name>/`.
- Each project folder should contain `PROJECT.md`.
- The first paragraph of `PROJECT.md` is the always-loaded high-level project description.
- The rest of `PROJECT.md` can capture deeper project context such as structure, conventions, commands, and current work.
- Rome does not scan `~/.rome/<profile>/projects/` to create or reconcile these files automatically. Agents and the guardian maintain this area periodically.
