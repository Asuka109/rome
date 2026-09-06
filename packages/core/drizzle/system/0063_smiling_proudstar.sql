CREATE TABLE `channel_pairing_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`channel_user_id` text NOT NULL,
	`display_name` text,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_pairing_requests_token_unique` ON `channel_pairing_requests` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_channel_pairing_pending_identity` ON `channel_pairing_requests` (`channel`,`channel_user_id`) WHERE "channel_pairing_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX `idx_channel_pairing_status_created` ON `channel_pairing_requests` (`status`,`created_at`);