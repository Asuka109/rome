CREATE TABLE `morning_brief__runs` (
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
