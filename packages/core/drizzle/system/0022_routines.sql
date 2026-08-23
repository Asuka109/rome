CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true,
	`trigger` text NOT NULL,
	`action_name` text NOT NULL,
	`args` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_fired_at` integer,
	`next_run_at` integer
);
--> statement-breakpoint
CREATE TABLE `routine_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL REFERENCES `routines`(`id`),
	`execution_id` text NOT NULL,
	`status` text NOT NULL,
	`payload` text,
	`fired_at` integer NOT NULL,
	`duration_ms` integer,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `idx_routine_runs_routine_id` ON `routine_runs` (`routine_id`);
--> statement-breakpoint
CREATE INDEX `idx_routine_runs_fired_at` ON `routine_runs` (`fired_at`);
--> statement-breakpoint
CREATE INDEX `idx_routine_runs_status` ON `routine_runs` (`status`);
