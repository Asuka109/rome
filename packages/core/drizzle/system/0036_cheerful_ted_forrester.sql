ALTER TABLE `routines` ADD `key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `routines_key_unique` ON `routines` (`key`);