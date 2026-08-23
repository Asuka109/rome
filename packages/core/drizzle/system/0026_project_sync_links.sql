CREATE TABLE `project_sync_links` (
	`id` text PRIMARY KEY NOT NULL,
	`project_path` text NOT NULL,
	`project_link_type` text NOT NULL,
	`project_link_extra` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_sync_links_project_path_unique` ON `project_sync_links` (`project_path`);
