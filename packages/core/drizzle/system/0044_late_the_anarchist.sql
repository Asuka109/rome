CREATE TABLE `session_turn_checkpoints` (
	`session_id` text NOT NULL,
	`turn_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_thread_id` text NOT NULL,
	`checkpoint_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `turn_id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
