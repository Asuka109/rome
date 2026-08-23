CREATE TABLE `linkedin_messages` (
	`message_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`sent_at` integer,
	`sender_name` text,
	`sender_profile_url` text,
	`sender_headline` text,
	`sender_type` text,
	`sender_is_self` integer DEFAULT false NOT NULL,
	`text` text,
	`subject` text,
	`reaction_count` integer,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`thread_id`, `message_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_linkedin_messages_thread_sent` ON `linkedin_messages` (`thread_id`,`sent_at`);--> statement-breakpoint
CREATE TABLE `linkedin_threads` (
	`thread_id` text PRIMARY KEY NOT NULL,
	`thread_url` text NOT NULL,
	`person_name` text,
	`conversation_name` text,
	`last_message_preview` text,
	`last_message_at` integer,
	`unread` integer DEFAULT false NOT NULL,
	`counterparty_type` text,
	`category` text,
	`last_synced_at` integer,
	`first_synced_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
