#!/usr/bin/env node
// Query the bundled royalty-free music catalog (catalog.json) without
// loading the full ~200 KB JSON into an agent's context. Companion to
// BACKGROUND_MUSIC.md — run with no arguments for usage.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = `Usage: node music/search.mjs <command> [options]

Commands:
  genres                 List the genres with track counts and descriptions
  search [options]       Find tracks; prints one compact line per match
  show <id>              Print one track's full JSON (for vendoring/provenance)

Search options:
  --genre <key>          Restrict to a genre key (see \`genres\`)
  --query <text>         Case-insensitive substring match on name/artist/tags
  --min-duration <sec>   Only tracks at least this long
  --max-duration <sec>   Only tracks at most this long
  --limit <n>            Max results (default 10)
  --stable               Deterministic id order (default is a fresh random
                         sample per run, so picks vary across apps)
  --json                 Emit matches as a JSON array instead of lines

Examples:
  node music/search.mjs genres
  node music/search.mjs search --genre ambient --max-duration 180
  node music/search.mjs search --query piano --limit 5
  node music/search.mjs show 412230`;

const catalogPath = join(dirname(fileURLToPath(import.meta.url)), "catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
// A track can be listed under several genres — dedupe by id and merge genres.
const byId = new Map();
for (const [genre, tracks] of Object.entries(catalog.tracks)) {
  for (const t of tracks) {
    const existing = byId.get(t.id);
    if (existing) existing.genres.push(genre);
    else byId.set(t.id, { genres: [genre], ...t });
  }
}
const allTracks = [...byId.values()];

function parseArgs(argv) {
  const opts = { limit: 10 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--genre":
        opts.genre = argv[++i];
        break;
      case "--query":
        opts.query = argv[++i]?.toLowerCase();
        break;
      case "--min-duration":
        opts.minDuration = Number(argv[++i]);
        break;
      case "--max-duration":
        opts.maxDuration = Number(argv[++i]);
        break;
      case "--limit":
        opts.limit = Number(argv[++i]);
        break;
      case "--stable":
        opts.stable = true;
        break;
      case "--json":
        opts.json = true;
        break;
      default:
        fail(`Unknown option: ${arg}`);
    }
  }
  return opts;
}

function fail(message) {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(1);
}

function formatLine(t) {
  const mins = `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, "0")}`;
  return `${t.id}  ${mins}  [${t.genres.join(",")}]  ${t.artist} — ${t.name}  ${t.mp3}`;
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "genres": {
    for (const g of catalog.genres) {
      console.log(
        `${g.key.padEnd(12)} ${String(g.count).padStart(3)} tracks  ${g.label} — ${g.description}`,
      );
    }
    console.log(`\n${allTracks.length} unique tracks. Source: ${catalog.source}`);
    break;
  }
  case "search": {
    const opts = parseArgs(rest);
    if (opts.genre && !catalog.tracks[opts.genre]) {
      fail(`Unknown genre "${opts.genre}". Run \`genres\` for valid keys.`);
    }
    let matches = allTracks.filter(
      (t) =>
        (!opts.genre || t.genres.includes(opts.genre)) &&
        (opts.minDuration === undefined || t.duration >= opts.minDuration) &&
        (opts.maxDuration === undefined || t.duration <= opts.maxDuration) &&
        (!opts.query ||
          [t.name, t.artist, ...(t.tags ?? [])].join(" ").toLowerCase().includes(opts.query)),
    );
    const total = matches.length;
    // Random order by default so successive runs (and different apps) don't
    // all converge on the same top-of-list track. Fisher–Yates.
    if (opts.stable) {
      matches.sort((a, b) => a.id - b.id);
    } else {
      for (let i = matches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [matches[i], matches[j]] = [matches[j], matches[i]];
      }
    }
    matches = matches.slice(0, opts.limit);
    if (opts.json) {
      console.log(JSON.stringify(matches, null, 2));
    } else {
      for (const t of matches) console.log(formatLine(t));
      const order = opts.stable ? "id order" : "random sample — re-run for different picks";
      console.log(
        `\n${matches.length} of ${total} matches (${order}). \`show <id>\` for full entry.`,
      );
    }
    break;
  }
  case "show": {
    const id = Number(rest[0]);
    const track = allTracks.find((t) => t.id === id);
    if (!track) fail(`No track with id ${rest[0]}.`);
    console.log(JSON.stringify(track, null, 2));
    break;
  }
  default:
    console.log(USAGE);
    process.exit(command ? 1 : 0);
}
