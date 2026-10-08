ALTER TABLE `users` ADD `onboarding_step` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `users` SET `onboarding_step` = -1;
