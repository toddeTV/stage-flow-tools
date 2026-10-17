# Storage System

This project stores quiz data in SQLite through Drizzle ORM.

## Storage Architecture

The active database file is `.data/db/stage-flow-tools.sqlite3` for local development, Docker, and direct Node.js runtime use.

Configuration in `nuxt.config.ts`:

```typescript
// Nitro storage config is not used for quiz persistence.
// Drizzle uses `server/database/local-config.ts`.
```

## Database Tables

- `questions`
- `answers`
- `legal_documents` — deployment-specific legal notice and privacy policy

Admin credentials are read from runtime config and are not stored in SQLite.

Question queue position is persisted in `questions.sort_order`. Admin and presenter
question lists read this order, and `publish-next` selects the next enabled question
after the active one. Previously published questions remain selectable. Without an
active question, it starts with the first enabled question; after the last enabled
question, it stops without wrapping. `questions.is_disabled` skips a question only
for automatic publication; direct admin publication remains available.

Changing a question's answer options through a single-question update after answers
were submitted requires an explicit reset confirmation. The answers are deleted and
the option update is stored in the same SQLite transaction.

Question-package imports only create new questions. A key already present in the
database aborts the whole transaction, preserving all questions, answers, and queue
state. The client preview lists conflicts; the transaction enforces this again.

`questions.authored_at` is a nullable UTC ISO 8601 timestamp supplied by a question's
author through JSON `authoredAt` directly on the question object. It records when the question was composed.
`questions.created_at` records when the database entry was created. Missing author
dates remain `NULL`, including for manually created questions. Normal edits preserve
the author date, and exports include it only when known. Admin question responses
expose it as `authoredAt`; public question responses omit it.

The additive author-date migration runs through the normal startup migration path.
Existing rows keep their content and receive `NULL` for `authored_at`; there is no
historical date backfill.

## Initialization

- `server/plugins/migrations.ts` applies pending Drizzle migrations when the Nitro server starts.
- `initStorage()` in `server/utils/storage.ts` initializes the shared SQLite client after startup.
- `vp run ops:seed:dev` applies local migrations and adds two development-only example questions to a fresh database.
- Emoji cooldown state stays in server memory and is not part of persisted storage.

## Maintenance

### Backup

Stop the application and every other database connection, including standalone
Drizzle Studio workers, before copying data. SQLite uses WAL mode; copying files
while writes continue does not guarantee a consistent backup. Keep all connections
stopped until the copy finishes. Stop if any command fails.

Run these commands from the directory containing `.data`. For Docker, copy the
host directory mounted at `/app/.data`, adjusting the source path if it has a
different name. Keep the backup destination outside the source directory.

~~~sh
umask 077
mkdir -p backups
backup_dir="$(mktemp -d backups/data-XXXXXXXX)"
cp -a .data "$backup_dir/data"
~~~

Keep the generated `backup_dir` path and record the application image tag or commit
that created the database. Copy the entire directory, including any remaining WAL
files, rather than just the main SQLite file. Backups contain participant IDs,
nicknames, and answers; restrict access and apply the deployment's retention policy.
The application can restart once the copy completes.

### Restore

Stop the application and all other database connections as for a backup. Select
the complete backup and verify that its `data/db/stage-flow-tools.sqlite3` file
exists before moving anything. Keep the application stopped throughout the restore
and stop if any command fails.

From the directory that normally contains `.data`, preserve the existing directory
before restoring. If `.data` does not exist on a fresh target, skip this block:

~~~sh
umask 077
mkdir -p backups
previous_dir="$(mktemp -d backups/before-restore-XXXXXXXX)"
mv .data "$previous_dir/data"
~~~

With `.data` absent, restore the selected backup, replacing `<backup-id>` with its
actual directory name:

~~~sh
backup_dir="backups/data-<backup-id>"
cp -a "$backup_dir/data" .data
~~~

For Docker, use the actual host mount path as the restore destination. Do not copy
into an existing data directory or mix files from different backups. Verify that
the runtime user can read and write the restored directory and database; `cp -a`
preserves source permissions and ownership where permitted.

Start with the application version recorded for the backup. Startup applies pending
migrations, so do not assume an older image can read a database already migrated by
a newer one. After starting, check the admin question list, retained answers/results,
and both public legal pages. Keep the preserved pre-restore directory until these
checks succeed; it contains participant data and needs the same access and retention
controls as the backup.

### Reset and deletion

| Operation | Questions | Answers | Queue and question state | Legal documents |
| --- | --- | --- | --- | --- |
| [Reset active answers](api.md#post-apianswersreset) | Preserved | Active question's answers deleted | Order and flags preserved | Preserved |
| [Reset Quiz](features/questions.md#reset-quiz) | Preserved | All deleted | Order preserved; all questions become unpublished, inactive, unlocked, and enabled | Preserved |
| [Delete all questions](api.md#post-apiquestionsdelete-all) | All deleted | All deleted | Queue removed | Preserved |
| Remove the entire `.data` directory | All deleted | All deleted | Queue and migration history removed | All deleted |

**Warning:** Removing `.data` permanently deletes the complete database, including
the legal notice and privacy policy. For another quiz run, use **Reset Quiz** to
retain questions and legal documents.

Before removing `.data`, stop the application and every other database connection
and make a [backup](#backup). The next start creates and migrates an empty database;
configure both legal documents again before public operation. See
[legal document setup](legal-texts.md).

## Production Mounts

- Docker deployments must persist `/app/.data`.
- Direct Node.js deployments must persist the project `.data/` directory.

## Performance Notes

- Reads and writes are local SQLite operations.
- Re-submitting an answer uses the `(question_id, user_id)` unique index for one upsert.
- Result changes are coalesced before the current question's answers are read and counted.
- Current architecture is fine for single-instance conference and workshop use.
- Multi-instance scaling would need a different shared storage layer and shared realtime coordination.
