CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`totalPredictions` int NOT NULL DEFAULT 0,
	`spamCount` int NOT NULL DEFAULT 0,
	`hamCount` int NOT NULL DEFAULT 0,
	`truePositives` int NOT NULL DEFAULT 0,
	`trueNegatives` int NOT NULL DEFAULT 0,
	`falsePositives` int NOT NULL DEFAULT 0,
	`falseNegatives` int NOT NULL DEFAULT 0,
	`accuracy` varchar(10) NOT NULL DEFAULT '0.95',
	`smsTotal` int NOT NULL DEFAULT 0,
	`emailTotal` int NOT NULL DEFAULT 0,
	`spamPercentage` varchar(10) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message` text NOT NULL,
	`verdict` enum('spam','ham') NOT NULL,
	`confidence` varchar(10) NOT NULL,
	`keywords` text,
	`messageType` enum('sms','email') DEFAULT 'sms',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`)
);
