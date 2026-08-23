CREATE TABLE `wa_chats` (
	`jid` text PRIMARY KEY NOT NULL,
	`name` text,
	`is_group` integer DEFAULT false NOT NULL,
	`last_message_at` integer,
	`unread_count` integer,
	`archived` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wa_contacts` (
	`jid` text PRIMARY KEY NOT NULL,
	`phone_number` text,
	`name` text,
	`notify` text,
	`verified_name` text,
	`img_url` text,
	`first_synced_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wa_messages` (
	`id` text NOT NULL,
	`chat_jid` text NOT NULL,
	`sender_jid` text,
	`from_me` integer DEFAULT false NOT NULL,
	`timestamp` integer NOT NULL,
	`type` text,
	`text` text,
	`has_media` integer DEFAULT false NOT NULL,
	`push_name` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`chat_jid`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_wa_messages_chat_ts` ON `wa_messages` (`chat_jid`,`timestamp`);