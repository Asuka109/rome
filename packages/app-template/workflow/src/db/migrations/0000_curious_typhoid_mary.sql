CREATE TABLE `__APP_TABLE_PREFIX____runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`dry_run` integer NOT NULL,
	`input` text,
	`result` text,
	`error` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`duration_ms` integer
);
