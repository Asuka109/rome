# Game App Guidance

Companion to [`AUTHORING.md` → Game apps](./AUTHORING.md#game-apps). Use this when a Rome app is meant to be a game rather than a tool with playful styling.

## Start with the game promise

Before choosing an engine or drawing screens, write a short game brief. It should answer the design questions that make the game coherent:

- **Player fantasy** — who does the player get to be, and what should feel satisfying? Examples: a village defender, a clever escape artist, a tiny shopkeeper, a starship pilot.
- **Core mechanic** — what does the player do every few seconds? Move and dodge, place units, match tiles, negotiate, aim, build, discover, route resources.
- **Goal and pressure** — what defines success, and what pushes back? A timer, enemies, scarce resources, limited moves, fog of war, reputation, puzzle constraints.
- **Setting** — where does play happen, and what does that imply visually and mechanically? A dungeon, garden, city block, classroom, asteroid field, haunted archive.
- **Background story** — the light narrative frame that explains why the player acts. Keep it short unless story is the game; it should motivate play, not delay it.
- **System logic** — the rules that make the game repeatable: scoring, progression, economy, enemy behavior, level generation, win/loss states, save state.

If the user gives only a genre ("make a farming game"), infer a tight first version instead of building a vague sandbox. A good first version has one player fantasy, one primary loop, and one clear failure or scoring rule.

## Scale the design to the game type

Different games need different amounts of story, systems, and polish. Do not overbuild lore for a puzzle game, and do not treat a mystery game like a reskinned clicker.

| Game type | Story need | Design priority | First-version focus |
| --- | --- | --- | --- |
| Puzzle | Low | Rules, progression, clarity | One clear rule set, readable feedback, increasing difficulty, undo/restart if useful |
| Arcade / action | Low to medium | Feel, challenge, replayability | Responsive controls, tight collision, scoring, difficulty ramp, fast restart |
| RPG / adventure | High | World, characters, quests | Strong player role, navigable world, character goals, inventory or quest state, meaningful choices |
| Strategy / simulation | Medium to high | Internal logic, factions, economy | Resource model, entity behavior, win pressure, readable cause-and-effect, tunable balance |
| Mystery / narrative | Very high | Timeline, motives, secrets, reveals | Premise, cast, clues, contradiction logic, reveal sequence, player deduction surface |
| Kids / casual web | Low to medium | Simple premise, cute theme, clear goal | Immediate affordances, forgiving rules, cheerful feedback, short rounds, obvious success state |

Use the type to decide where complexity belongs:

- **Puzzle** — write the rules before the theme. The player should understand what changed after each move.
- **Arcade / action** — tune input, movement, hitboxes, and restart speed before adding progression. Game feel is the product.
- **RPG / adventure** — define the world promise, protagonist role, main conflict, and first quest. Empty exploration is not enough.
- **Strategy / simulation** — model the system first: resources, agents, incentives, constraints, and how the player reads them.
- **Mystery / narrative** — outline the truth before writing scenes. Know what happened, who knows what, and how each clue narrows the answer.
- **Kids / casual web** — reduce rules and text. Prefer visible goals, friendly feedback, and assets that communicate the premise instantly.

## Author the loop first

Design around the smallest playable loop:

1. Player sees a situation.
2. Player makes a meaningful choice.
3. The system responds immediately.
4. The result changes the next choice.

Everything else supports that loop. Add story, upgrades, levels, inventory, dialogue, or crafting only when they make the loop deeper. Do not spend the first implementation on menus, lore, or decorative screens while the core interaction is still unplayable.

Use these checkpoints before implementation:

- **One-sentence pitch** — "You are X, trying to Y, by doing Z, while W pushes back."
- **Thirty-second prototype** — the game is understandable and interactive within 30 seconds of launch.
- **Readable state** — the player can see what matters: health, score, resources, selected unit, timer, objective, or danger.
- **Complete round** — the game has a start, active play, win/loss or score result, and restart.
- **Tunable constants** — speed, damage, spawn rate, score values, cooldowns, and timers live in one place so balance can be adjusted quickly.

## Pick the smallest engine that fits

- For simple toys, puzzles, visualizers, board-game helpers, or single-screen interactions, raw `<canvas>` is fine. Keep the loop small, store durable progress in app state, and avoid building a private engine framework unless the game needs it.
- For lightweight 3D, physics-light scenes, model viewers, or spatial interactions, Three.js is appropriate. It is still a rendering library, so expect to own input, scenes, game state, collision rules, menus, saves, and audio behavior.
- For a real game with levels, animation states, collisions, UI screens, imported maps, particles, or reusable entities, consider a real game engine. Godot is a good default because it is open source, has an editor, supports 2D and 3D, and can export web builds. Phaser is also reasonable for browser-first 2D games.

Choose the engine before coding. Rewriting a half-built custom canvas game into an engine costs more than starting with the right runtime.

## Source assets deliberately

Prefer existing free or permissively licensed assets that already fit the user's scene, instead of drawing placeholder art in code:

- **Kenney** — broad, polished 2D/3D asset packs, UI, icons, effects, and audio that work well for prototypes and small games.
- **OpenGameArt** — large community catalog with varied styles and licenses; verify each asset's license and attribution requirements before shipping.
- **Tiny Swords** — strong fit for fantasy tactics, village, RPG, and strategy scenes when that art direction matches the request.

Pick one coherent art direction and stay inside it. Mixing unrelated packs usually looks worse than using a simpler but consistent set.

Choose assets after the game brief. The best asset pack is the one that supports the player fantasy, setting, and core mechanic with minimal custom work. If no coherent pack exists, reduce scope or change the setting before committing to a mismatched visual direction.

## Ship assets inside the app

Vendor game assets into `<app-root>/src/assets/` so the packed app is self-contained and uses the `<appId>/assets/` namespace at runtime. Keep provenance nearby: source URL, author or pack name, license, and attribution text if required.

Do not rely on remote sprites, models, sounds, or maps unless the product explicitly needs live external content. Remote assets can fail under app CSP, disappear later, or make the game non-reproducible.

## Keep the Rome shell in mind

The game can own an immersive full-screen surface, but it is still a Rome app:

- Provide clear start, pause, restart, and mute controls.
- Persist meaningful progress, settings, and high scores when they matter.
- Keep menus and settings readable in light and dark host themes, or isolate the game surface with its own deliberate style.
- Test pointer, keyboard, and small-screen behavior before declaring the game playable.
