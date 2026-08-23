CREATE TABLE `connector__emitted_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`received_at` integer NOT NULL,
	`payload_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_connector_emitted_events_received_at` ON `connector__emitted_events` (`received_at`);--> statement-breakpoint
CREATE INDEX `idx_connector_emitted_events_topic` ON `connector__emitted_events` (`topic`);--> statement-breakpoint
CREATE TABLE `connector__settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
