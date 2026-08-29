CREATE TABLE `map_library` (
	`mapId` text PRIMARY KEY NOT NULL,
	`dataJson` text NOT NULL,
	`updatedBy` text,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`mapId`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `presence` ALTER COLUMN "mapId" TO "mapId" text NOT NULL REFERENCES maps(id) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `presence` ALTER COLUMN "userId" TO "userId" text NOT NULL REFERENCES user(id) ON DELETE cascade ON UPDATE no action;