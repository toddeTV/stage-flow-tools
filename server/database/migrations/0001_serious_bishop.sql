ALTER TABLE `questions` ADD `is_disabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `questions` AS `current_question`
SET `sort_order` = (
  SELECT COUNT(*)
  FROM `questions` AS `earlier_question`
  WHERE `earlier_question`.`created_at` < `current_question`.`created_at`
    OR (
      `earlier_question`.`created_at` = `current_question`.`created_at`
      AND `earlier_question`.`id` < `current_question`.`id`
    )
);--> statement-breakpoint
CREATE INDEX `questions_sort_order_idx` ON `questions` (`sort_order`);
