CREATE TABLE `shared_chats` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`snapshot` text NOT NULL,
	`layout` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_shared_chats_session_id` ON `shared_chats` (`session_id`);