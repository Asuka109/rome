ALTER TABLE `webchat_messages` ADD `turn_id` text;--> statement-breakpoint
CREATE INDEX `idx_webchat_messages_turn_id` ON `webchat_messages` (`turn_id`);