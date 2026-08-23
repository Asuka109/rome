CREATE TABLE IF NOT EXISTS `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`requested_by` text NOT NULL,
	`description` text NOT NULL,
	`payload` text,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `channel_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`channel` text NOT NULL,
	`channel_user_id` text NOT NULL,
	`display_name` text,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`tzid` text NOT NULL,
	`local_time` text NOT NULL,
	`rrule` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`workflow_name` text NOT NULL,
	`args` text NOT NULL,
	`enabled` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`last_run_at` integer,
	`next_run_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `guardian_auth` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `guardian_auth_user_id_unique` ON `guardian_auth` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`bond_level` text NOT NULL,
	`profile_path` text,
	`approved` integer DEFAULT false,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_type` text NOT NULL,
	`scope_value` text NOT NULL,
	`rules` text NOT NULL,
	`priority` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sentinel_log` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`channel` text NOT NULL,
	`channel_user_id` text NOT NULL,
	`display_name` text,
	`thread_id` text,
	`text` text,
	`action` text NOT NULL,
	`response` text,
	`reviewed` integer DEFAULT false,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_name` text NOT NULL,
	`channel_thread_key` text,
	`created_at` integer NOT NULL,
	`last_active_at` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `webchat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `webchat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`persona_id` text,
	`created_at` integer NOT NULL
);
