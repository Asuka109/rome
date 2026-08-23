CREATE TABLE `connection_grants` (
	`custody` text NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL,
	`credential` text,
	`conferred_at` integer,
	`last_renewed_at` integer,
	`degraded_at` integer,
	`degraded_reason` text,
	PRIMARY KEY(`custody`, `name`)
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`service` text NOT NULL,
	`label` text NOT NULL,
	`created_at` integer NOT NULL
);
