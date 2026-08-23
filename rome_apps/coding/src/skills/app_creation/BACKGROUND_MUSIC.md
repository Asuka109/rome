# Background Music Selection Guide

Companion to [`AUTHORING.md` → Background music](./AUTHORING.md#background-music), which decides **whether** an app gets music. This doc covers **which** tracks to pick and how to ship them.

## Source: the curated catalog

Source every track from the catalog that ships with this skill at `music/catalog.json`: 429 tracks across 15 genres, all from Pixabay's royalty-free library under the [Pixabay Content License](https://pixabay.com/service/license-summary/) — free even in monetized use, no attribution required, no copyright strikes. Each entry carries `id`, `name`, `artist`, `duration` (seconds), `mp3` (direct CDN URL), `thumbnail`, `pageUrl`, and `tags`.

Query the catalog through the bundled script — it prints compact results, keeping the ~200 KB JSON out of your context. Run it from this skill's directory (it resolves the catalog relative to itself):

```sh
node music/search.mjs genres                                  # 15-genre overview with counts
node music/search.mjs search --genre ambient --max-duration 180
node music/search.mjs show 412230                             # one track's full JSON (mp3, pageUrl, tags)
```

`search` prints one line per match (`id  m:ss  [genres]  artist — title  mp3-url`), 10 max by default, as a **fresh random sample on every run** — deliberate, so apps drawing from the same genre end up with different tracks. Take the sample as given. `--stable` gives deterministic id order, `--json` emits full entries, no arguments prints all options.

Ship the music by **vendoring**: at authoring time, download the chosen `mp3` URLs into `<app-root>/src/assets/music/` (e.g. `curl -o`) and play those files through the app's `<appId>/assets/` namespace (see [App Assets](./AUTHORING.md#app-assets)). Keep each shipped track's `pageUrl` alongside (a comment or metadata field) — it documents provenance.

Vendoring is the **only** shipping mode: Rome app surfaces enforce a self/local-only Content-Security-Policy with no `media-src`, so at runtime only same-origin audio plays. A remote CDN `<audio>` source passes typecheck and works in a plain browser tab, then fails silently inside Rome — treat the catalog's CDN URLs strictly as authoring-time download and preview links.

## Matching genre to app type

Pick by the feeling the app should sustain:

| App / moment | Genre keys |
| --- | --- |
| Casual games, party & trivia | `upbeat`, `pop`, `funk` |
| Action, arcade, fast-paced games | `electronic`, `rock`, `hiphop` |
| Story, adventure, mystery, roleplay | `cinematic`, `piano`, `synthwave` |
| Retro / nostalgia themes | `synthwave`, `funk` |
| Meditation, breathing, sleep, spa | `meditation`, `ambient` |
| Focus / pomodoro ambience | `chill`, `ambient`, `piano` |
| Win states, celebration screens (short stingers) | `upbeat`, `tropical` |
| Warm personal moments (journals, memories) | `acoustic`, `piano` |

Selection rules:

- **Prefer instrumental** — lyrics compete with reading and with the app's own audio; verify by previewing.
- **Pick loop-friendly tracks** — consistent energy over a big intro/outro arc; 90–180 s loops least noticeably (filter with `--min-duration`/`--max-duration`).
- **One mood per surface** — one track per mode (menu vs. gameplay, session vs. summary), held for the whole session.
- **Preview at shipping volume** — a track that sounds good loud can turn muddy at 25%.

## Playback rules

- **Start on a user gesture.** Browsers block autoplay with sound, so tie the first `play()` to an explicit interaction.
- **Keep it quiet by default.** Volume around 0.2–0.3; lower if the app also plays voice or effect sounds.
- **Put mute one tap away and persist it.** Store the choice (per the stateful-app rule) so it survives across visits.
- **Loop gracefully.** Use the audio element's `loop`, or a small crossfade if the track has an audible seam.
- **Pause on navigation** away from the music-bearing view, so the app goes quiet when its surface does.
