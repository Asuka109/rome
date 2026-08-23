ALTER TABLE `webchat_sessions` RENAME TO `rome_sessions`;--> statement-breakpoint
ALTER TABLE `rome_sessions` RENAME COLUMN `kind` TO `type`;--> statement-breakpoint
ALTER TABLE `rome_sessions` ADD `source_channel` text;--> statement-breakpoint
ALTER TABLE `rome_sessions` ADD `source_thread_id` text;--> statement-breakpoint
ALTER TABLE `rome_sessions` ADD `source_thread_name` text;--> statement-breakpoint
ALTER TABLE `rome_sessions` ADD `source_thread_type` text;--> statement-breakpoint
ALTER TABLE `webchat_messages` RENAME TO `rome_agent_messages`;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `trigger_kind` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `trigger_name` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `trigger_action_name` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `trigger_execution_id` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `root_action_execution_id` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `parent_action_execution_id` text;--> statement-breakpoint
ALTER TABLE `webchat_trace_blocks` RENAME TO `rome_agent_trace_blocks`;--> statement-breakpoint
UPDATE `rome_sessions`
SET `type` = CASE `type`
  WHEN 'user' THEN 'webchat'
  WHEN 'handoff' THEN 'webchat_handoff'
  ELSE `type`
END;--> statement-breakpoint
UPDATE `rome_sessions`
SET
  `source_channel` = 'webchat',
  `source_thread_id` = `id`,
  `source_thread_name` = `name`,
  `source_thread_type` = 'private'
WHERE `type` IN ('webchat', 'webchat_handoff');--> statement-breakpoint
DROP INDEX IF EXISTS `idx_webchat_sessions_project_path`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_webchat_messages_session_id`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_webchat_messages_turn_id`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_webchat_trace_blocks_session_id`;--> statement-breakpoint
CREATE INDEX `idx_rome_sessions_project_path` ON `rome_sessions` (`project_path`);--> statement-breakpoint
CREATE INDEX `idx_rome_sessions_source_channel` ON `rome_sessions` (`source_channel`);--> statement-breakpoint
CREATE INDEX `idx_rome_sessions_source_thread` ON `rome_sessions` (`source_channel`, `source_thread_id`);--> statement-breakpoint
CREATE INDEX `idx_rome_agent_messages_session_id` ON `rome_agent_messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_rome_agent_messages_turn_id` ON `rome_agent_messages` (`turn_id`);--> statement-breakpoint
CREATE INDEX `idx_rome_agent_trace_blocks_session_id` ON `rome_agent_trace_blocks` (`session_id`);
