CREATE TABLE `provider_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text,
	`display_name` text,
	`email` text,
	`login` text,
	`avatar_url` text,
	`scopes` text,
	`token_ciphertext` text NOT NULL,
	`token_version` integer DEFAULT 1 NOT NULL,
	`token_expires_at` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_accounts_provider_unique` ON `provider_accounts` (`provider`);
