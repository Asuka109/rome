CREATE TABLE `webchat_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webchat_projects_path_unique` ON `webchat_projects` (`path`);
--> statement-breakpoint
INSERT OR IGNORE INTO `webchat_projects` (`id`, `name`, `path`, `created_at`, `updated_at`, `archived_at`)
VALUES ('default', 'default', 'default', unixepoch(), unixepoch(), NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO `webchat_projects` (`id`, `name`, `path`, `created_at`, `updated_at`, `archived_at`)
SELECT
	'project_' || lower(hex(randomblob(16))) AS `id`,
	COALESCE(NULLIF(MAX(`project_name`), ''), `project_path`) AS `name`,
	`project_path` AS `path`,
	COALESCE(MIN(`created_at`), unixepoch()) AS `created_at`,
	COALESCE(MAX(`created_at`), unixepoch()) AS `updated_at`,
	NULL AS `archived_at`
FROM `webchat_sessions`
WHERE `project_path` IS NOT NULL
	AND trim(`project_path`) <> ''
GROUP BY `project_path`;
