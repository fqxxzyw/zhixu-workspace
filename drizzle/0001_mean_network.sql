ALTER TABLE `pages` ADD `file_type` text DEFAULT 'note' NOT NULL;--> statement-breakpoint
ALTER TABLE `pages` ADD `source_path` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `pages` ADD `source_asset` text;