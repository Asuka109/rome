CREATE INDEX IF NOT EXISTS `idx_rome_agent_messages_role_created_at` ON `rome_agent_messages` (`role`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_rome_agent_trace_blocks_terminal_message` ON `rome_agent_trace_blocks` (`message_id`) WHERE json_extract("rome_agent_trace_blocks"."content", '$.type') IN ('result', 'error');--> statement-breakpoint
CREATE INDEX `idx_rome_agent_trace_blocks_turn_end_message` ON `rome_agent_trace_blocks` (`message_id`) WHERE json_extract("rome_agent_trace_blocks"."content", '$.type') = 'turn_end';
