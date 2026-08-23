-- `tzMode` is now a required field on schedule triggers. Backfill any
-- pre-existing schedule routine that predates the field so the data matches the
-- type and no row resolves its zone implicitly.
--
--   * one-off schedules (those with a `$.date`) → `fixed`: they must fire at the
--     same absolute instant, which means resolving date+localTime against their
--     stored tzid, not the guardian's current zone.
--   * recurring schedules → `floating`: a guardian-only "9am" means "9am wherever
--     they are", and this matches how an unset tzMode already resolved at runtime.
--
-- Deliberate: this classifies recurring rows from the older events→routines
-- migration as `floating` too, even though those were pinned to
-- their stored `tzid`. The project does not require backward compatibility for
-- existing-install data (see root CLAUDE.md), so we accept that over carrying a
-- bespoke "was-event-migrated" detector — new installs get `fixed` from
-- migrate-events-to-routines.ts directly.
UPDATE `routines`
SET `trigger` = json_set(
  `trigger`,
  '$.tzMode',
  CASE
    WHEN json_extract(`trigger`, '$.date') IS NOT NULL THEN 'fixed'
    ELSE 'floating'
  END
)
WHERE json_valid(`trigger`)
  AND json_extract(`trigger`, '$.type') = 'schedule'
  AND json_extract(`trigger`, '$.tzMode') IS NULL;
