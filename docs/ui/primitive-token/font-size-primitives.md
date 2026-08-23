# Font Size Primitives

A primitive token doc for the font size dimension. [ui-primitive-tokens.md](../../authoring/ui-primitive-tokens.md) is the rulebook.

## Tokens

One scale, `--rome-font-size-*`, has nine steps. A step's name is its value in px at a 16px root.

The steps are 13, 14, 15, 16, 18, 20, 22, 24, and 30. No other number exists.

A step holds its value in rem, not px. The value is the name divided by 16. `[mech]`

Each px figure in this doc assumes a 16px root. Raising the browser font size scales every step.

## How the scale is built

- **The scale grows on demand.** A new semantic text token added each step. No unused number rounds out the sequence. `[human]`
- **The middle run advances by 2px.** Its steps are 16, 18, 20, 22, and 24. The gaps preserve five distinct levels without a large jump. `[mech]`
- **The three smallest gaps remain dense.** The gaps are 7.7% from 13 to 14 and 7.1% from 14 to 15. `[mech]`
- **Every value is exact in rem at the default root.** Each name divided by 16 produces a terminating binary fraction. No step rounds during resolution. `[mech]`
- **A sustained-reading demand fixed the 16px step.** Prose and field text read it, which also clears the threshold mobile Safari zooms below on focus. `[human]`
- **The scale spans 13px to 30px.** Below 13, a glyph falls under comfortable legibility at typical display density. No recorded demand exceeds 30. `[human]`
- **Rem authorship matches the box size scale.** A badge box and its label scale together instead of drifting apart. `[mech]`

## Forbidden usage

- A call site never writes a font size. Text reads a semantic token, and only semantic tokens read this scale. `[mech]`
- A value between steps never enters as a one-off. A repeated unmet need triggers a semantic roster decision, then a scale decision. `[mech]`
- A component never derives a size by arithmetic on a step. It never sizes text in em against its parent. `[mech]`
- A step never enters to restore the 16px zoom threshold for one surface. A step without a semantic reader has no consumer. `[mech]`
- A size never carries emphasis or state. `[llm]`

  > Prefer: an active row that leads by color, in the same role as its neighbors.
  > Over: a label bumped one size to read as important.
