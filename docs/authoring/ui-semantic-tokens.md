# Semantic Tokens

This file owns the **semantic tokens** — when one earns a doc, when one merges or leaves — and the format of the **semantic token docs** in [`../ui/semantic-token/`](../ui/semantic-token/surfaces.md). [ui-tokens.md](ui-tokens.md) defines the terms, holds every rule the token docs share, and wins where a rule here conflicts with it.

The two written docs answer Theme mapping in opposite directions. `surfaces.md` maps every token to a primitive step per theme. `typography.md` maps every role to one primitive per dimension across every theme, with the kit owning the values. The Theme mapping rule below settles that split.

## Format

One doc per token, or one per role group. Required sections: Why this name, Usage statement, Theme mapping, Constraints, Examples. `[mech]`

A doc covering a role group states its roster above the first section. The roster is the contract, and a reader takes the full set of tokens from it without reading further. `[mech]`

### Why this name

How the name states purpose rather than appearance. `[mech]`

The section shows the call a reader makes from the name alone. `[llm]`

> Prefer: "each token names where a region sits in the stack, never how light the region is. The stack reverses between modes, so a name built on lightness would invert."
> Over: "the names are semantic rather than visual."

### Usage statement

One line per token, in the form "Used for ____. Not used for ____." Both clauses appear. A doc covering a role group carries one such line for every token in the roster. `[mech]`

The negative clause names the nearest wrong use, not an absurd one. `[llm]`

> Prefer: "`--surface-muted` — Used for a region recessed inside a card. Not used for a region that floats."
> Over: "`--surface-muted` — Used for a recessed region. Not used for text."

### Theme mapping

The primitive the token resolves to in each theme. Light and dark both appear. A doc covering more than one token or more than one theme uses a table with one row per token and one column per theme and mode. A theme half that copies another theme's half states that once, above the table, in place of its column. `[mech]`

A token that resolves to an expression, aliases another token, or binds straight through to a token with nothing behind it states that below the table, in place of a row. `[mech]`

On a dimension with no primitives, the section states that, names the owner of the values, and states what varies them. That statement replaces the mapping. It never replaces the section. `[mech]`

### Constraints

The contrast, perceptual, or compositional limits the token holds, one bullet per limit. `[mech]`

A limit that two tokens share names both, and names what a consumer does when the pair collapses. `[mech]`

### Examples

At least one positive and one negative. `[mech]`

The negative example looks usable and still breaks the token's purpose. `[llm]`

> Prefer: using `text-secondary` on a disabled label, which reads as de-emphasis rather than an unavailable control.
> Over: using `text-secondary` on a saturated red fill, which any reviewer catches on sight.

## Admission

A token or role group earns a doc when both hold: `[human]`

1. A consumer picks between the token and a neighbor, and the wrong pick ships a visible defect.
2. The pick rests on purpose, not on the value. A token whose only rule is the primitive it resolves to belongs in a theme mapping, not a doc.

One doc covers a role group when its tokens share one usage question. A reader answering that question reads one doc, never a set. `[human]`

## Eviction

A doc leaves when its token stops clearing the admission bar. A token that merges into a neighbor leaves as an alias line in the surviving doc, and any other departure takes a [deprecation note](ui-tokens.md#deprecation). `[human]`

A merge tests purpose, not appearance. `[llm]`

> Prefer: merging `bg-panel` and `bg-card` because both usage statements read "a raised container surface".
> Over: keeping them apart because one resolves to `gray-50` and the other to `gray-100`.

## Intake

A correction that recurs across semantic docs either becomes a rule in this file, or the maintainer rejects it in writing and states the reason. Silent recurrence means this file is dead. A rule enters only after the practice it codifies appeared in two or more semantic docs. `[human]`

Where a semantic doc conflicts with this file, this file wins. `[human]`
