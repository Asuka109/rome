CREATE TABLE `action_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`action_name` text NOT NULL,
	`action_type` text,
	`status` text NOT NULL,
	`args` text,
	`error` text,
	`duration_ms` integer,
	`initiator` text,
	`parent_id` text,
	`created_at` integer NOT NULL
);
