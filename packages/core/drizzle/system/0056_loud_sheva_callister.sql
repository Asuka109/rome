-- One channel identity belongs to one person. Existing rows may already break
-- that: before this index, two writers could each map the same sender, and the
-- People page then showed them under two people at once.
--
-- Survivor per identity: a real placement outranks a dismissal onto the
-- stranger sentinel, then the oldest row wins so the choice is deterministic.
DELETE FROM `channel_mappings`
WHERE `rowid` NOT IN (
  SELECT `rowid` FROM (
    SELECT
      `rowid`,
      ROW_NUMBER() OVER (
        PARTITION BY `channel`, `channel_user_id`
        ORDER BY (`person_id` = '__STRANGER__') ASC, `rowid` ASC
      ) AS `rn`
    FROM `channel_mappings`
  ) WHERE `rn` = 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_channel_mappings_identity` ON `channel_mappings` (`channel`,`channel_user_id`);
