# Writing Rules

These rules apply to every file under `docs/`, and to the surfaces that adopt them by reference.

## Terminology

Use the industry-standard term when one exists.

> Prefer: glossary, runbook, spec, changelog.
> Over: a coined name for the same thing.

A project-specific term earns admission only with a one-line separation from its nearest industry near-miss. If the line cannot be written, the industry term wins.

> Prefer: "A *skill* is a runbook loaded into agent context on demand — unlike a runbook, an agent executes it, not a person."
> Over: introducing "skill" with no line separating it from "runbook".

## Word choice

- One name per thing. Never call the same item by two different terms — pick the canonical name and use it everywhere.

  > Prefer: "the daemon" throughout the doc.
  > Over: "the daemon" in one paragraph and "the host process" in the next, for the same thing.

- One meaning per word. A word never relies on context to disambiguate between two senses.

  > Prefer: "install" always means the daemon operation, "set up" covers the dev environment.
  > Over: "install" means the daemon operation in one section and the dev-environment steps in another.

- Use the plain, common word over the fancy synonym: *start* not *begin/commence/initiate*, *use* not *utilize/leverage*, *help* not *facilitate*, *make sure* not *ensure*, *before* not *prior to*, *get* not *obtain/acquire*, *show* not *demonstrate*, *also* not *additionally/furthermore/moreover*.
- Cut marketing adjectives entirely: *seamless*, *robust*, *powerful*, *cutting-edge*, *effortless*, *world-class*, *next-generation*, *revolutionary*.
- No history words: *previously*, *no longer*, *used to*, *renamed from*. Docs state what is true now.

## Verbs

- Active voice.

  > Prefer: "the parser reads the file."
  > Over: "the file is read by the parser."

- Use a real verb for the action, not a nominalization.

  > Prefer: "analyze the log."
  > Over: "perform an analysis of the log."

- No stacked auxiliaries or throat-clearing.

  > Prefer: "this improves X."
  > Over: "it is important to note that this may help to improve X."

- Avoid an "-ing" main verb when a simple tense will do.

  > Prefer: "the loader validates the manifest."
  > Over: "the loader is validating the manifest."

## Sentences

- Flag any descriptive sentence over 25 words for splitting.
- No contractions.
- Keep the articles (*a*, *an*, *the*, *this*, *these*) — no telegraph style.

  > Prefer: "the daemon rejects the request."
  > Over: "daemon rejects request."

## Punctuation

- No semicolons — split into two sentences.

## Structure

- One topic per paragraph.

  > Prefer: one paragraph on admission, a separate paragraph on eviction.
  > Over: one paragraph covering both.

- At most six sentences per paragraph.
- No preamble, no summary, no closing remarks. The doc starts with content and stops when the content ends.

  > Prefer: opening with the first rule.
  > Over: "This document describes the rules for…" followed by the first rule.

- Write steps as a numbered list: imperative mood, one action per item.

  > Prefer: "1. Stop the daemon. 2. Delete the cache. 3. Restart the daemon."
  > Over: "Stop the daemon, then delete the cache and restart it."

- Condition before command. State the condition first, then the action.

  > Prefer: "If the token is expired, refresh it."
  > Over: "Refresh the token if it is expired."

- State a rule without its rationale. If the rationale is not obvious from the rule, keep it.

  > Prefer: "If a concept has a canonical home, link to it instead of re-explaining it."
  > Over: adding "an inlined explanation duplicates the source of truth and rots when the canonical version changes."

## Linking

If a concept has a canonical home, link to it instead of re-explaining it.

> Prefer: "messages are triaged by the [sentinel](../concepts/messaging.md#sentinel)."
> Over: restating what the sentinel is, then using it.
