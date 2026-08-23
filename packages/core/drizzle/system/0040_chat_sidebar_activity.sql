ALTER TABLE `rome_sessions` ADD `activity_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `rome_sessions` ADD `last_seen_activity_at` integer;--> statement-breakpoint
UPDATE `rome_sessions`
SET `activity_at` = COALESCE(
  (
    SELECT MAX(`rome_agent_messages`.`created_at`)
    FROM `rome_agent_messages`
    WHERE `rome_agent_messages`.`session_id` = `rome_sessions`.`id`
      AND `rome_agent_messages`.`role` IN ('user', 'assistant')
  ),
  `rome_sessions`.`created_at`
);--> statement-breakpoint
UPDATE `rome_sessions`
SET `activity_at` = `created_at`
WHERE `activity_at` IS NULL;--> statement-breakpoint
UPDATE `rome_sessions`
SET `last_seen_activity_at` = `activity_at`
WHERE `type` = 'webchat';--> statement-breakpoint
CREATE INDEX `idx_rome_sessions_sidebar_activity` ON `rome_sessions` (`type`, `activity_at`, `created_at`, `id`);--> statement-breakpoint
CREATE INDEX `idx_rome_sessions_project_activity` ON `rome_sessions` (`project_path`, `type`, `activity_at`, `created_at`, `id`);
