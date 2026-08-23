# Box Size Primitives

A primitive token doc for the box size dimension — the authored edge length of a box: a dot, a glyph, a control height, an avatar. [ui-primitive-tokens.md](../../authoring/ui-primitive-tokens.md) is the rulebook.

The values live in `packages/ui/src/styles.css`.

## Tokens

One flat scale, `--rome-size-*`, of seventeen steps running 4px to 64px. The steps are 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, and 64 — no other number exists. A step's name is its value in px at a 16px root.

A step holds its value in rem, not px — the name divided by 16 — so a reader who raises the browser font size scales the boxes with the text they hold. Each px figure in this doc is the step at a 16px root. `[mech]`

## Constraints

| Property | Value |
|---|---|
| Increment | 2px to 16, then 4px to 48, then 8px |
| Identification floor | 12px |
| Pointer floor | 24px |
| Touch floor | 44px |
| Smallest relative gap | 9%, from 44 to 48 |
| Range | 4 to 64px |

A floor constrains what a box of a given size can do, not which steps exist. Every step above a floor can do everything that floor permits.

## How the scale is built

- **The dimension earns a scale because the eye detects a near-miss far more acutely than it compares sizes.** Two boxes on a shared row that differ by 2px read as misaligned at a glance, long before either reads as the smaller box. Alignment judgment resolves a difference an order of magnitude finer than size judgment. In a continuous value space, the near-miss is the default outcome. On a scale, the exact match is. `[mech]`

- **The floors are human constants, not preferences.** Below 12px a box registers as present and colored, but its shape does not read. Shape discrimination needs detail near one minute of arc — about a device pixel at desk distance — and strokes at that size fall under it. Below 24px a box fails as a pointer target: acquisition time and error follow Fitts's law and rise sharply under that size. A touch-first target needs 44px of fingertip contact patch. `[human]`

- **The run floors at 4px and ends at 64px.** Below 4px a box stops registering reliably against its background at typical display density. Above 64px a reader stops judging a box against its siblings and starts judging what it contains — the box has become a region. A region's measure is layout: a fraction, a grid track, a container query. `[human]`

- **Steps from 24 up sit strictly on the 4px spacing grid.** A control height sums with paddings and gaps in row arithmetic, and only a step on the spacing grid keeps that sum on it. `[mech]`

- **Steps below 16 run at 2px, the increment of the text they match.** A small box centers inside a line or a control instead of entering a sum, so the spacing grid does not bind it. It matches the optical size of the text beside it, and the text sizes in that range sit at 12, 14, and 16px — even numbers stepping 2px. A 4px increment at this magnitude also jumps 33–100%, coarser than anywhere else on the scale. Even steps keep a box centered in an even container on whole pixels. `[mech]`

- **Steps between 24 and 48 run the full 4px grid even though the top pairs sit near 9%, too close to read as two sizes.** Those neighbors exist to match different row anatomies exactly, not to read as different sizes. The eye reads a box there from its content. `[mech]`

- **Rem authorship cannot break the floors.** The floors are physical and bind at the default root. Raising the root grows every box and only clears them further. `[mech]`

- **A step enters only when a class of box needs it.** Seventeen demands exist today, so seventeen steps exist. Nothing rounds out the run. `[human]`

## Forbidden usage

- A call site never writes an arbitrary edge length. Every authored width and height comes from a step. `[mech]`
- A zero-valued min constraint (`min-width: 0` / `min-height: 0`) is exempt: it resets a flex or grid item's automatic min-content floor and authors no edge length. `[mech]`
- A value between two steps never enters as a one-off. A box that wants 30px takes 28px or 32px, and a repeated need for a missing step is a scale decision. `[mech]`
- A control's height comes through the control geometry tokens, never from a step read directly. `[mech]`
- A component never derives a size by arithmetic on a step. Derivation happens once, in the scale. `[mech]`
- The scale never sizes a text run. A width that exists to bound prose comes from a character measure or a layout fraction. `[mech]`
- A size never signals a state. A box that grows to fit content passes. A box that grows to announce hover, focus, or selection fails. `[llm]`

  > Prefer: a selected tile keeps its box and signals with its border and fill.
  > Over: a tile that grows when selected.
