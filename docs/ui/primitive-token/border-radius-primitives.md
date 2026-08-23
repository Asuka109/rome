# Border Radius Primitives

A primitive token doc for the border radius dimension. [ui-primitive-tokens.md](../../authoring/ui-primitive-tokens.md) is the rulebook.

The values live in `packages/ui/src/styles.css`.

## Tokens

One scale, `--rome-radius-*`, of four steps and a saturation token. A step's value is its number in px. The steps are 4, 8, 12, and 16 — no other number exists.

`--rome-radius-full` holds `9999px`. A corner renders fully round once its value reaches half the box's shorter side, so on any box Rome draws the token is past saturation and the exact number is unobservable.

## How the scale is built

- **Every gap is one spacing step.** Neighbors differ by 4px, which is `--rome-space-1`. A corner inset by one spacing step from an enclosing corner lands exactly one step down, so nested corners stay concentric without arithmetic. `[mech]`
- **No neighboring pair sits closer than 33%.** The relative gap runs from 100% at the bottom to 33% at the top. A pair closer than about 25% stops reading as two corner sizes at these magnitudes. `[mech]`
- **The scale spans 4px to 16px.** Below 4px a corner reads as square at typical display density. A larger step enters at 24, not 20 — 20 sits 25% above 16, under the gap floor. `[human]`
- **Every step is authored in px.** A corner offsets px quantities — 1px hairlines and px control insets — so the gaps hold exact against them at any root font size. `[mech]`
- **Fully round is a saturation, not a step.** `--rome-radius-full` sits outside the run: the step rules — spacing-step gaps, concentric nesting, the gap floor — do not apply to it. One token pins the saturation because a hand-picked large literal can silently fall below it: 99px reads as a pill on a control and as a 99px corner on a tall panel. `[mech]`
- **A step enters only when a class of box needs it.** Four box magnitudes exist today, so four steps exist. Nothing rounds out the run. `[human]`

## Forbidden usage

- A call site never writes an arbitrary radius. A corner comes from a step or from `--rome-radius-full`. `[mech]`
- A value between two steps never enters as a one-off. A corner that wants 10px takes 8px or 12px, and a repeated need for a missing step is a scale decision. `[mech]`
- A control corner comes through `--control-r-*`, never from a step read directly. `[mech]`
- A component never derives a corner by arithmetic on a step. Derivation happens once, in the scale. `[mech]`
- A radius never signals a state. A corner that tracks the shape of a merged surface passes, and a corner that announces the state fails. `[llm]`

  > Prefer: a range endpoint rounds its outer corners and squares the seam it shares with the next cell.
  > Over: an input that softens its corners on focus.
