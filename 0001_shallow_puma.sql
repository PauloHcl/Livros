CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(48) NOT NULL,
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`author` varchar(180) NOT NULL,
	`coverUrl` text,
	`isbn` varchar(32),
	`criticScore` decimal(4,1),
	`description` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemType` enum('game','book') NOT NULL,
	`itemId` int NOT NULL,
	`authorName` varchar(120) NOT NULL,
	`body` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `epubs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`author` varchar(180) NOT NULL,
	`rating` decimal(3,1),
	`fileUrl` text NOT NULL,
	`storageKey` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `epubs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `externalLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`category` varchar(72) NOT NULL DEFAULT 'Geral',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `externalLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`coverUrl` text,
	`criticScore` decimal(4,1),
	`preferredPlatform` enum('xbox','playstation','nintendo','pc','multi') NOT NULL DEFAULT 'multi',
	`releaseYear` int,
	`description` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `liveStreams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`streamerName` varchar(120) NOT NULL,
	`platform` enum('youtube','twitch','kick') NOT NULL,
	`streamUrl` text NOT NULL,
	`embedUrl` text,
	`layoutGroup` varchar(48),
	`isActive` boolean NOT NULL DEFAULT true,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `liveStreams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemType` enum('game','book') NOT NULL,
	`itemId` int NOT NULL,
	`rating` decimal(3,1) NOT NULL,
	`personName` varchar(120) NOT NULL,
	`timeSpent` int NOT NULL,
	`progress` int NOT NULL,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','editor','admin') NOT NULL DEFAULT 'user';