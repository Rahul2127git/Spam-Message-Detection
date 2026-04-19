ALTER TABLE `analytics` MODIFY COLUMN `accuracy` varchar(20) NOT NULL DEFAULT '0.95';--> statement-breakpoint
ALTER TABLE `analytics` MODIFY COLUMN `spamPercentage` varchar(20) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE `predictions` MODIFY COLUMN `message` LONGTEXT NOT NULL;--> statement-breakpoint
ALTER TABLE `predictions` MODIFY COLUMN `confidence` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `predictions` MODIFY COLUMN `keywords` LONGTEXT;