CREATE TABLE `webhook_invocations` (
	`execution_id` text PRIMARY KEY NOT NULL,
	`action_name` text NOT NULL,
	`args` text,
	`callback_url` text,
	`status` text NOT NULL,
	`result` text,
	`error` text,
	`callback_status` text NOT NULL,
	`callback_attempted_at` integer,
	`callback_delivered_at` integer,
	`callback_response_status` integer,
	`callback_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_webhook_invocations_created_at` ON `webhook_invocations` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_webhook_invocations_action_name` ON `webhook_invocations` (`action_name`);
