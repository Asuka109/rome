ALTER TABLE `rome_sessions` ADD `parent_session_id` text;--> statement-breakpoint
ALTER TABLE `rome_sessions` ADD `parent_turn_id` text;--> statement-breakpoint
CREATE INDEX `idx_rome_sessions_parent_session` ON `rome_sessions` (`parent_session_id`);