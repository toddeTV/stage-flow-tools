CREATE TABLE `legal_documents` (
	`key` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "legal_documents_key_check" CHECK("legal_documents"."key" IN ('legal-notice', 'privacy-policy'))
);
--> statement-breakpoint
CREATE TRIGGER `legal_documents_updated_at`
AFTER UPDATE OF `content` ON `legal_documents`
FOR EACH ROW
WHEN NEW.`updated_at` = OLD.`updated_at`
BEGIN
	UPDATE `legal_documents`
	SET `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
	WHERE `key` = OLD.`key`;
END;
