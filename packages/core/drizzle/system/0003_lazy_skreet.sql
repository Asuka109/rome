CREATE TABLE `execution_journal` (
	`id` text PRIMARY KEY NOT NULL,
	`root_execution_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`action_name` text NOT NULL,
	`args_hash` text NOT NULL,
	`args` text,
	`result` text,
	`status` text NOT NULL,
	`expected_action_name` text,
	`expected_args_hash` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `approvals` ADD `executed_at` integer;