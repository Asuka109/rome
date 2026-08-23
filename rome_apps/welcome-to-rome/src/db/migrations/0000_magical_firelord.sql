CREATE TABLE `welcome_to_rome__progress` (
	`id` text PRIMARY KEY NOT NULL,
	`node` text NOT NULL,
	`intro_raw_input` text,
	`intro_summary` text,
	`app_ideas` text,
	`app_ideas_generated_at` text,
	`completed_at` text,
	`updated_at` text NOT NULL
);
