CREATE TABLE `webchat_trace_blocks` (
	`message_id` text NOT NULL,
	`seq` integer NOT NULL,
	`session_id` text NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`message_id`, `seq`)
);
--> statement-breakpoint
CREATE INDEX `idx_webchat_trace_blocks_session_id` ON `webchat_trace_blocks` (`session_id`);