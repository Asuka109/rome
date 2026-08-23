# Color-system audit rules

Every rule follows the same shape: **definition**, **why it matters**, **detection procedure**, **enumerated exceptions**, **severity**, and an example pair. Do not audit from memory of the rule names — the exceptions are where precision lives. A candidate that matches an exception is a pass, not a "borderline flag."

Severity semantics match ux-semantics-audit: `block` findings are mechanical and near-certain — the consuming agent should fix all of them. `warn` findings involve judgment — the agent may reasonably decline with a reason. Never promote a judgment call to `block`.

Tier 1 rules are backed by `scripts/analyze-palette.mjs`; run the script, don't estimate the numbers.

---

## Tier 1 — mechanical (script-backed)

### `declared-contrast-pairs` (block)

**Definition.** Every fill token must have a declared foreground partner (`primary`/`primary-foreground`, `success-bg`/`success-fg`), and every declared pair must meet WCAG 2.x for its use: ≥4.5:1 for body text, ≥3:1 for large text and UI components (borders, icons, focus rings). Report APCA Lc alongside (Lc 75 body / 60 large / 45 UI) as the forward-looking check, but WCAG is the pass/fail line.

**Why.** Contrast can only be *guaranteed* for combinations the system names. An undeclared combination is a per-usage accident; a declared pair that fails is a shipped accessibility defect. The pairing discipline (Material's `on-*`, this repo's `*-foreground`) is what turns contrast from a per-screen review into a system invariant.

**Detection.** Enumerate fill tokens and their declared partners from the token source. Feed every pair into `analyze-palette.mjs contrast` — once per theme × mode (light and dark are separate palettes; a pass in one says nothing about the other). Fill tokens with no declared partner are themselves findings.

**Exceptions.**
- Decorative/ambient fills never intended to carry content (chart gridlines, subtle background tints under their own declared text token).
- Disabled-state pairs — WCAG exempts disabled controls (but note when a disabled state is *far* below any readability, ~<2:1, as a `warn`).
- Pairs failing WCAG but passing APCA where the fg/bg polarity makes WCAG's formula known-wrong (e.g. white-on-orange); flag as `warn` with both numbers, not `block`.

**Violation.** `--warning-fg: #9a6700` declared on `--warning-bg: #fff8c5` at 3.9:1 for body text.
**Pass.** Same pair used only for a large-text badge label (≥3:1 target, declared as such).

**Brand-pinned fills.** When the failing fill is a brand/identity color (a documented brand comment, a marketing-locked hex), do NOT propose changing its value — the finding stands, but the fix must work around the constraint. Offer the alternatives ladder, each verified through the analyzer, and let the owner choose:

1. **Flip the label polarity** — dark ink on the unchanged fill often passes where white fails. Check the knock-on: hover must then move the fill *lighter*, not darker, or the hover state fails instead. Also report both WCAG and APCA here — mid-tone fills are where the two models disagree on polarity (WCAG can prefer dark text while APCA scores light text higher); say which line the system follows.
2. **Split brand from action** — keep the brand color for identity (logo, highlights-with-alpha, ring, selected states) and give text-carrying fills a darker action token, ideally an existing step (the hover step frequently qualifies). Same reason link colors are rarely the brand color.
3. **Demote the brand fill to non-text duty** — buttons move to a neutral/ink primary; the brand hue stays everywhere it doesn't carry a label.
4. **Soft-fill variant** — tint background + dark same-hue text (the `-bg`/`-fg` status pattern), reserving the solid fill for large text or iconography.

The one thing not to offer: leaving a body-text pair below the target because "it's the brand." The brand constrains *which* fix, not *whether*.

### `ramp-uniformity` (warn)

**Definition.** Primitive scales (gray-50…900, blue-50…900) should be perceptually uniform: OKLCH lightness monotonic within a ramp, adjacent steps evenly spaced, and the *same step across different hue ramps* at near-equal L (spread ≲0.03–0.04), so steps are contrast-interchangeable.

**Why.** HSL/hex-picked ramps lie about lightness (yellow at 50% HSL is far brighter than blue). Uniform ramps buy the system invariant "any 600 on white passes AA" — without them, every hue needs its own contrast audit and state-derivation rules (step ±1) produce inconsistent jumps.

**Detection.** Extract ramps from the primitive layer, run `analyze-palette.mjs ramps`. The script flags non-monotonic ramps, adjacent-step irregularity >0.04, and cross-ramp spread >0.03. Numbers are advisory: a deliberate design (e.g. compressed dark end for surface stacking) can exceed them — check whether the irregularity is *documented intent* before flagging.

**Exceptions.**
- Ramps whose ends are intentionally compressed for surface elevation stacking (common in dark-mode neutral ramps) — when the token comments/docs say so.
- Accent ramps that deliberately pin one step to a brand color that can't move; flag only the *other* steps if they don't interpolate smoothly around it.
- Ramps not used for interchangeable roles (e.g. a single-purpose gradient scale).

**Violation.** `blue-600` L=0.62 while `red-600` L=0.51 — a badge recolored from blue to red silently loses AA.
**Pass.** All `*-600` within L 0.51–0.53, documented as "600 = solid fill on white".

### `cvd-safety` (block for status sets, warn for other groups)

**Definition.** Colors that carry *distinct meanings within the same context* (status families, categorical chart series, diff added/removed) must remain pairwise distinguishable under protanopia, deuteranopia, and tritanopia simulation.

**Why.** ~8% of men have some CVD, most commonly red/green. A success/danger pair that collapses under deuteranopia makes the most safety-critical distinction in the UI invisible to them.

**Detection.** Group meaning-carrying sets, run `analyze-palette.mjs cvd`. A pair "collapses" when it is distinguishable normally (ΔE ≥ 0.10) but not under a simulated type (ΔE < 0.10). Before flagging, check the redundant-channel exception below — it is the common resolution.

**Exceptions.**
- **The collapse is fully compensated by a non-color channel at every usage site**: status always paired with an icon/label, chart series always directly labeled. This is ux-semantics-audit's `color-not-sole-channel` territory — if the channel redundancy exists, `cvd-safety` passes; if it doesn't, file the finding under *this* rule for the palette AND note the per-view violations belong to ux-semantics-audit.
- Pairs that never co-occur in the same view (verify, don't assume).
- Lightness-differentiated pairs: if the two colors still differ strongly in L (ΔL ≥ 0.15), they remain distinguishable as light-vs-dark even when hue collapses.

**Violation.** Success `#1a7f37` vs danger `#cf222e` at ΔE 0.055 under deuteranopia, used as dot-only indicators.
**Pass.** Same pair, but every status render includes an icon (check/cross) — note as pass with the dependency stated.

---

## Tier 2 — structural (grep-backed)

### `token-architecture` (block)

**Definition.** Three tiers: primitives (`--blue-600`) → semantic tokens (`--color-action-primary`, `--surface`) → components. Components reference *only* the semantic layer. No raw hex/oklch/rgb literals and no primitive references in component code.

**Why.** The semantic layer is the load-bearing prerequisite for theming: dark mode and alternate themes are remaps of semantics. A component holding `#3b82f6` or `var(--blue-600)` is invisible to every remap — it will be wrong in exactly one theme × mode combination, discovered visually in production.

**Detection.** Grep component sources for: hex literals (`#[0-9a-fA-F]{3,8}` in style/className contexts), `oklch(`/`rgb(` literals, primitive token names, and framework raw shades (Tailwind `bg-gray-100`, `text-red-500`, `bg-black/40`). Each hit is a finding with file:line evidence.

**Exceptions.**
- The theme-definition and primitive-definition files themselves (that's where literals *belong*).
- True constants that are the same in every theme by physics, not by policy (e.g. `transparent`; a `#000` scrim only if the design system explicitly documents scrims as theme-invariant).
- Illustrations/logos with brand-fixed colors.
- Test fixtures asserting on computed styles.

**Violation.** `className="bg-gray-100 dark:bg-gray-800"` in a component — a hand-rolled theme fork outside the token system.
**Pass.** `className="bg-surface-muted"` — one name, correct in every theme × mode.

### `step-semantics` (warn)

**Definition.** Each ramp step (or each semantic token) has an assigned, documented role — the system can answer "which token for a hovered subtle background?" without a per-case decision. Radix's 12-step model (1–2 app bg, 3–5 component states, 6–8 borders, 9–10 solid, 11–12 text) is the reference articulation.

**Why.** Unassigned steps mean every usage is an individual judgment call, and judgment drifts: three developers pick three different "subtle border" grays and the UI accretes near-duplicate values that can never be safely consolidated.

**Detection.** Look for the mapping: token comments, a themes/tokens doc, or naming that *is* the role (`--surface-hover` beats `--gray-200` + tribal knowledge). Then sample component usage for role violations (a "border" step used as text) and for near-duplicate semantic tokens with no distinguishing role.

**Exceptions.**
- Systems that skip primitives entirely and only expose role-named semantic tokens — that *is* step semantics, in stronger form.
- Steps intentionally reserved/unused (documented as such).

**Violation.** Both `--gray-150` and `--gray-200` used interchangeably for card borders across sibling components.
**Pass.** Token comment: "surface-hover — hover fill for rows/cells on surface".

### `state-derivation` (warn)

**Definition.** Interactive-state variants (hover, active, focus, disabled) are derived by a stated rule — step ±1 on the ramp, a fixed OKLCH ΔL, or a named token per state — not hand-picked per component.

**Why.** Derived states make new components inherit correct interaction feedback for free and keep perceived "pressiness" consistent. Hand-picked one-offs drift, and half of them silently fail contrast after the next palette tweak.

**Detection.** Find the rule (token set like `*-hover`, or a documented convention). Then grep components for state variants that bypass it (`hover:bg-[#...]`, ad-hoc `dark:hover:` forks, opacity hacks like `hover:opacity-80` on interactive fills where the system has hover tokens).

**Exceptions.**
- `opacity`-based disabled states (a common, legitimate convention — flag only if the system *also* has disabled tokens being bypassed).
- Focus treatment via a single global ring token (that is a derivation rule).
- One-off marketing/hero surfaces explicitly outside the system.

**Violation.** Three buttons with `hover:bg-blue-700`, `hover:bg-blue-600/90`, `hover:brightness-95` — three unrelated darkening rules.
**Pass.** All interactive fills use their `*-hover` partner token.

### `dark-mode-integrity` (block for failing pairs, warn for structure)

**Definition.** The dark palette is its own remap of the semantic layer with its own contrast audit — not an inversion or reuse of light values. Established dark-mode discipline: desaturate accents (saturated colors vibrate on dark), avoid pure-black canvas, express elevation by *lightening* surfaces, re-verify every declared pair.

**Why.** Light-mode contrast ratios do not transfer — a 4.6:1 pair can drop below 3:1 after remap. And mechanical inversion produces the classic defects: blinding saturated accents, elevation reading backwards, halation on pure black.

**Detection.** Structure: confirm dark values are independently authored per semantic token (this repo: the `dark` half in theme definitions). Then run the full `declared-contrast-pairs` set against the dark values — every failing pair is a `block` under this rule. Spot-check: accent chroma in dark vs light (higher-or-equal chroma on dark canvas is a `warn` smell), canvas L (pure `#000` canvas is a `warn` unless documented OLED intent), elevation direction (raised surfaces should have L ≥ canvas L).

**Exceptions.**
- Deliberate OLED-black themes (documented).
- Tokens genuinely invariant across modes (brand logo color) — but they still take the contrast re-check against their dark-mode partners.

**Violation.** `dark.muted-foreground` inherited from light at 3.2:1 against the dark surface.
**Pass.** Dark half independently sets every token; contrast table green in both modes.

---

## Tier 3 — judged

### `hue-budget` (warn)

**Definition.** Every hue family in the palette has a nameable job. The healthy shape: 1–2 neutral families doing ~80–90% of the UI, one brand/accent hue, and a small fixed status set (success/warning/danger/info). Hues beyond that need an answer to "what does this hue *mean*?"

**Why.** Unassigned hues are decoration debt: they get reached for arbitrarily, dilute the meaning of the hues that *do* signify (is teal a status? a category? a whim?), and multiply the contrast/CVD surface that every future change must re-verify.

**Detection.** List hue families from the primitive layer. For each, state its role from the semantic tokens that reference it. A hue referenced by zero semantic tokens, or only by one-off component styles, is a candidate. Count is a smell, not a rule — a data-viz categorical palette legitimately adds 6+ hues *with* the job "categorical series".

**Exceptions.**
- Categorical/data-viz palettes (their job is plurality — audit them under `cvd-safety` instead).
- Multi-brand or white-label systems where extra accent families are the product.
- Hues kept for a documented migration (note staleness if the migration looks abandoned).

**Violation.** A `--teal-*` ramp referenced by nothing but one promo banner.
**Pass.** Exactly: sand neutrals, ember accent, red/green/amber/blue status — each named in the theme docs.

---

## Cross-references

- **Color-only meaning at specific usage sites** (`color-not-sole-channel`, WCAG 1.4.1) belongs to **ux-semantics-audit** — it is a per-view rule. This audit covers the *palette-level* half (`cvd-safety`); when you find per-view violations while verifying the redundant-channel exception, note them as ux-semantics-audit hand-offs, don't duplicate the rule here.
- **Remediation order** when many rules fire at once: fix `ramp-uniformity` first (uniform ramps make `declared-contrast-pairs` and `state-derivation` nearly free), then `token-architecture`, then `step-semantics`. Say this in the report summary so the consuming agent doesn't fix findings in dependency-inverted order.
