CREATE TABLE `webchat_workspace_layouts` (
	`session_id` text PRIMARY KEY NOT NULL,
	`layout` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `webchat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
