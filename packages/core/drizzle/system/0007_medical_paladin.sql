ALTER TABLE `guardian_auth` ADD `onboarding_complete` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_ej_root_execution_id` ON `execution_journal` (`root_execution_id`);--> statement-breakpoint
CREATE INDEX `idx_ej_created_at` ON `execution_journal` (`created_at`);