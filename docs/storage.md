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

- Admin credentials are read from runtime config and are not stored in SQLite.

Question queue position is persisted in `questions.sort_order`. Admin and presenter
question lists read this order, and `publish-next` selects the next enabled question
after the active one. Previously published questions remain selectable. Without an
active question, it starts with the first enabled question; after the last enabled
question, it stops without wrapping. `questions.is_disabled` skips a question only
for automatic publication; direct admin publication remains available.

Changing a question's answer options through a single-question update after answers
were submitted requires an explicit reset confirmation. The answers are deleted and
the option update is stored in the same SQLite transaction.

Question-package imports intentionally use a different rule. An import may replace a
matching question's text and answer options while retaining its existing answers and
lifecycle state. Answers whose stored English option label no longer matches an
imported option remain stored and count toward `totalVotes`, but do not appear in an
option's displayed count. The import preview warns the admin that changed options can
make results inconsistent.

## Initialization

- `server/plugins/migrations.ts` applies pending Drizzle migrations when the Nitro server starts.
- `initStorage()` in `server/utils/storage.ts` initializes the shared SQLite client after startup.
- `vp run ops:seed:dev` applies local migrations and adds two development-only example questions to a fresh database.
- Emoji cooldown state stays in server memory and is not part of persisted storage.

## Maintenance

Backup local storage:

```bash
cp -r .data/ backups/data-$(date +%Y%m%d)
```

Reset all stored quiz data:

```bash
rm -rf .data/
```

The next server start recreates the SQLite database file.

## Production Mounts

- Docker deployments must persist `/app/.data`.
- Direct Node.js deployments must persist the project `.data/` directory.

## Performance Notes

- Reads and writes are local SQLite operations.
- Re-submitting an answer uses the `(question_id, user_id)` unique index for one upsert.
- Result changes are coalesced before the current question's answers are read and counted.
- Current architecture is fine for single-instance conference and workshop use.
- Multi-instance scaling would need a different shared storage layer and shared realtime coordination.
