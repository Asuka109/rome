CREATE TABLE `oauth_pending_attempts` (
	`state` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`tenant` text NOT NULL,
	`callback_origin` text NOT NULL,
	`code_verifier` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_pending_attempts_expires_at` ON `oauth_pending_attempts` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_webchat_messages_session_id` ON `webchat_messages` (`session_id`);