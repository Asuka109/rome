CREATE TABLE `briefing__briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`content` text,
	`error` text,
	`channel` text,
	`delivered` integer DEFAULT false NOT NULL,
	`delivery_error` text,
	`scout_result_count` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `briefing__briefs_kind_idx` ON `briefing__briefs` (`kind`);--> statement-breakpoint
CREATE TABLE `briefing__scout_results` (
	`id` text PRIMARY KEY NOT NULL,
	`scout_id` text NOT NULL,
	`scout_title` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`content` text,
	`error` text,
	`trigger` text DEFAULT 'schedule' NOT NULL,
	`consumed_at` integer,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `briefing__scout_results_scout_idx` ON `briefing__scout_results` (`scout_id`);--> statement-breakpoint
CREATE INDEX `briefing__scout_results_consumed_idx` ON `briefing__scout_results` (`consumed_at`);--> statement-breakpoint
CREATE TABLE `briefing__scouts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`prompt` text NOT NULL,
	`interval_minutes` integer DEFAULT 360 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_run_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `briefing__scouts_enabled_idx` ON `briefing__scouts` (`enabled`);--> statement-breakpoint
CREATE TABLE `briefing__settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
