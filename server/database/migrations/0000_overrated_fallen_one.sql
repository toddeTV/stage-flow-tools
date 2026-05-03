CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_nickname` text NOT NULL,
	`selected_answer` text NOT NULL,
	`timestamp` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answers_question_user_unique` ON `answers` (`question_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `answers_question_idx` ON `answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `answers_user_idx` ON `answers` (`user_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`question_text` text NOT NULL,
	`answer_options` text NOT NULL,
	`note` text,
	`is_active` integer DEFAULT false NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`already_published` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questions_key_unique` ON `questions` (`key`);--> statement-breakpoint
CREATE INDEX `questions_active_idx` ON `questions` (`is_active`);--> statement-breakpoint
CREATE INDEX `questions_created_at_idx` ON `questions` (`created_at`);