CREATE TABLE `contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`fundraiserId` text NOT NULL,
	`displayName` text NOT NULL,
	`amountMinor` integer NOT NULL,
	`transactionReference` text,
	`privatePhone` text,
	`receivedAt` text,
	`source` text NOT NULL,
	`hideName` integer DEFAULT 1 NOT NULL,
	`removedAt` text,
	`recordVersion` integer DEFAULT 1 NOT NULL,
	`recordedAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`fundraiserId`) REFERENCES `fundraisers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "amount_bounds" CHECK("contributions"."amountMinor">0 AND "contributions"."amountMinor"<=10000000000),
	CONSTRAINT "source_valid" CHECK("contributions"."source" IN ('manual','whatsapp','mpesa'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contributions_fundraiser_reference` ON `contributions` (`fundraiserId`,`transactionReference`);--> statement-breakpoint
CREATE INDEX `idx_contributions_fundraiser` ON `contributions` (`fundraiserId`);--> statement-breakpoint
CREATE TABLE `fundraisers` (
	`id` text PRIMARY KEY NOT NULL,
	`publicId` text NOT NULL,
	`title` text NOT NULL,
	`purpose` text NOT NULL,
	`paymentNumber` text NOT NULL,
	`targetMinor` integer,
	`publicNamesEnabled` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`credentialHash` text NOT NULL,
	`credentialVersion` integer DEFAULT 1 NOT NULL,
	`recordVersion` integer DEFAULT 1 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	CONSTRAINT "target_bounds" CHECK("fundraisers"."targetMinor" IS NULL OR ("fundraisers"."targetMinor">0 AND "fundraisers"."targetMinor"<=10000000000)),
	CONSTRAINT "status_valid" CHECK("fundraisers"."status" IN ('active','closed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fundraisers_publicId_unique` ON `fundraisers` (`publicId`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`fundraiserId` text NOT NULL,
	`contributionId` text,
	`action` text NOT NULL,
	`previousValue` text,
	`newValue` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`fundraiserId`) REFERENCES `fundraisers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_history_fundraiser` ON `history` (`fundraiserId`);--> statement-breakpoint
CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`fundraiserId` text NOT NULL,
	`idempotencyKey` text NOT NULL,
	`digest` text NOT NULL,
	`preconditionOk` integer NOT NULL,
	`result` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`fundraiserId`) REFERENCES `fundraisers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "operation_precondition" CHECK("operations"."preconditionOk"=1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_operations_key` ON `operations` (`fundraiserId`,`idempotencyKey`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
