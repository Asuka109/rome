# Spacing Primitives

A primitive token doc for the spacing dimension. [ui-primitive-tokens.md](../../authoring/ui-primitive-tokens.md) is the rulebook.

The values live in `packages/ui/src/styles.css`.

## Tokens

One flat scale, `--rome-space-*`, of fifteen steps running 0 to 96px. The steps are 0 through 10, then 12, 16, 20, and 24 — no other number exists. A step's value is its number times 0.25rem, so the number is the pixel value at a 16px root divided by four.

A step holds its value in rem, so a reader who raises the browser font size scales the layout with it. Each px figure in this doc is the step at a 16px root. `[mech]`

## How the scale is built

- **The increment widens as the values grow, because a reader judges a gap against its neighbours, not in absolute pixels.** A 4px difference is obvious between 4px and 8px and invisible between 88px and 92px. `[mech]`
- **The 11% floor fixes where the increment first widens.** The relative gap between neighbours falls as the values grow and touches the floor between 36px and 40px. One more 4px step would cross it, so the increment doubles at 40px. `[mech]`
- **The steps above 48px are sparse, because those values are layout rather than rhythm.** Most padding and most gaps sit at or below 40px. A step above 48px enters only when a surface needs it, and nothing rounds out the run. `[human]`
- **The scale stops at 96px.** A larger measurement is page layout, and it comes from a fraction, a grid track, or a container query. `[human]`

## Constraints

| Property | Value |
|---|---|
| Base grid | 4px |
| Smallest relative gap | 11%, from `--rome-space-9` to `--rome-space-10` |
| Range | 0 to 96px |

A pair that crosses the 11% floor stops reading as two distinct sizes. A step off the 4px grid breaks the rhythm shared with the [box size scale](box-size-primitives.md), which sits on this grid from 16px up so heights and gaps sum back onto it.

## Forbidden usage

- A call site never writes an arbitrary spacing value. Every gap comes from a step. `[mech]`
- A value between two steps never enters as a one-off. A gap that needs 6px takes 4px or 8px, and a repeated need for a missing step is a scale decision. `[mech]`
- A component never derives a gap by arithmetic on a step. `[mech]`
- Spacing carries no meaning. A step never encodes a state, a status, or a depth. `[mech]`
