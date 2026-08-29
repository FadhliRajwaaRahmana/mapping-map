ALTER TABLE `maps` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `publicRole` text DEFAULT 'viewer' NOT NULL;