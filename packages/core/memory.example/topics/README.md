# Topic Memory

`memory/topics/` holds the agent's durable, per-subject knowledge — one file per
topic the guardian cares about.

- A topic file is `memory/topics/<topic>.md`, where `<topic>` is a URL-safe slug
  (e.g. `health.md`, `finances.md`, `house-remodel.md`).
- This is where the *full* knowledge of a subject lives. `MEMORY.md` stays an
  index: it keeps only frequently-used facts inline and a one-line pointer to each
  topic file under its **Topics** section.
- Keep durable takeaways here, not day-to-day detail. Specifics and events belong
  in the journal (`memory/journal/yyyy/mm/dd.md`); distil only the lasting summary
  up into the topic file.
- One fact lives in one place. Before adding to a topic file, check whether it is
  already captured here or elsewhere, and update rather than duplicate. Remove
  what is wrong or superseded.
- Topic files are loaded on demand when the agent works on that subject, not at
  the start of every session — so they can hold more than `MEMORY.md`.

Recommended format:

```markdown
# Topic Name

One-line description of what this topic covers.

## Key facts
- Durable facts that define the current state of this subject.

## Details
- Deeper notes, history, and references worth keeping.
```
