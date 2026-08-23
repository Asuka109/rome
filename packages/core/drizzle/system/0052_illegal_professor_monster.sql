ALTER TABLE `rome_agent_messages` ADD `platform_message_id` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `sender_id` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `sender_name` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `reply_to_platform_message_id` text;--> statement-breakpoint
ALTER TABLE `rome_agent_messages` ADD `context_injected_turn_id` text;--> statement-breakpoint
CREATE INDEX `idx_rome_agent_messages_platform_message` ON `rome_agent_messages` (`session_id`,`platform_message_id`) WHERE "rome_agent_messages"."platform_message_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_rome_sessions_channel_address` ON `rome_sessions` (`source_channel`,`source_thread_id`) WHERE "rome_sessions"."type" = 'channel' AND "rome_sessions"."source_channel" IS NOT NULL AND "rome_sessions"."source_thread_id" IS NOT NULL;
