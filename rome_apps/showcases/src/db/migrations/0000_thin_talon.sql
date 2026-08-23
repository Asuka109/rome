CREATE TABLE `showcases__collections` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_showcases_collections_source` ON `showcases__collections` (`source`);--> statement-breakpoint
CREATE INDEX `idx_showcases_collections_updated_at` ON `showcases__collections` (`updated_at`);--> statement-breakpoint
CREATE TABLE `showcases__traces` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`captured_at` integer NOT NULL,
	`blocks_json` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`summary_json` text NOT NULL,
	`metadata_json` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`cache_read_tokens` integer,
	`cache_write_tokens` integer,
	`cost_usd` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_showcases_traces_collection_id` ON `showcases__traces` (`collection_id`);--> statement-breakpoint
CREATE INDEX `idx_showcases_traces_captured_at` ON `showcases__traces` (`captured_at`);