CREATE TABLE `__new_action_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`root_execution_id` text NOT NULL,
	`action_name` text NOT NULL,
	`action_type` text,
	`status` text NOT NULL,
	`args` text,
	`error` text,
	`duration_ms` integer,
	`initiator` text,
	`parent_id` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`cancel_requested_at` integer,
	`cancellation_reason` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_action_executions` (
	`id`,
	`root_execution_id`,
	`action_name`,
	`action_type`,
	`status`,
	`args`,
	`error`,
	`duration_ms`,
	`initiator`,
	`parent_id`,
	`started_at`,
	`finished_at`,
	`cancel_requested_at`,
	`cancellation_reason`,
	`created_at`
)
SELECT
	`id`,
	`id`,
	`action_name`,
	`action_type`,
	`status`,
	`args`,
	`error`,
	`duration_ms`,
	`initiator`,
	`parent_id`,
	`created_at`,
	NULL,
	NULL,
	NULL,
	`created_at`
FROM `action_executions`;
--> statement-breakpoint
DROP TABLE `action_executions`;
--> statement-breakpoint
ALTER TABLE `__new_action_executions` RENAME TO `action_executions`;
