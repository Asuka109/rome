ALTER TABLE `webchat_messages` ADD `input_tokens` integer;--> statement-breakpoint
ALTER TABLE `webchat_messages` ADD `output_tokens` integer;--> statement-breakpoint
ALTER TABLE `webchat_messages` ADD `cache_read_tokens` integer;--> statement-breakpoint
ALTER TABLE `webchat_messages` ADD `cache_write_tokens` integer;--> statement-breakpoint
ALTER TABLE `webchat_messages` ADD `cost_usd` real;--> statement-breakpoint
UPDATE `webchat_messages`
SET
  `input_tokens` = COALESCE((
    SELECT SUM(COALESCE(json_extract(`block`.`value`, '$.accounting.usage.inputTokens'), 0))
    FROM json_each(`webchat_messages`.`content`) AS `block`
    WHERE json_extract(`block`.`value`, '$.type') IN ('result', 'error')
  ), 0),
  `output_tokens` = COALESCE((
    SELECT SUM(COALESCE(json_extract(`block`.`value`, '$.accounting.usage.outputTokens'), 0))
    FROM json_each(`webchat_messages`.`content`) AS `block`
    WHERE json_extract(`block`.`value`, '$.type') IN ('result', 'error')
  ), 0),
  `cache_read_tokens` = COALESCE((
    SELECT SUM(COALESCE(json_extract(`block`.`value`, '$.accounting.usage.cacheReadTokens'), 0))
    FROM json_each(`webchat_messages`.`content`) AS `block`
    WHERE json_extract(`block`.`value`, '$.type') IN ('result', 'error')
  ), 0),
  `cache_write_tokens` = COALESCE((
    SELECT SUM(COALESCE(json_extract(`block`.`value`, '$.accounting.usage.cacheWriteTokens'), 0))
    FROM json_each(`webchat_messages`.`content`) AS `block`
    WHERE json_extract(`block`.`value`, '$.type') IN ('result', 'error')
  ), 0),
  `cost_usd` = COALESCE((
    SELECT SUM(COALESCE(json_extract(`block`.`value`, '$.accounting.costUsd'), 0))
    FROM json_each(`webchat_messages`.`content`) AS `block`
    WHERE json_extract(`block`.`value`, '$.type') IN ('result', 'error')
  ), 0)
WHERE `role` = 'trace'
  AND json_valid(`content`);
