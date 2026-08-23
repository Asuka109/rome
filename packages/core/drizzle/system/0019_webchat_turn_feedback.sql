CREATE TABLE `webchat_turn_feedback` (
	`session_id` text NOT NULL,
	`turn_id` text NOT NULL,
	`rating` text NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `turn_id`),
	FOREIGN KEY (`session_id`) REFERENCES `webchat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webchat_turn_feedback_session_id` ON `webchat_turn_feedback` (`session_id`);
