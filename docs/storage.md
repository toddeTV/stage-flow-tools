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
question lists read this order, and `publish-next` selects the first unpublished,
enabled question. `questions.is_disabled` skips a question only for automatic
publication; direct admin publication remains available.

Changing a question's answer options after answers were submitted requires an explicit
reset confirmation. The answers are deleted and the option update is stored in the
same SQLite transaction, so results never reference obsolete options.

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
- Current architecture is fine for single-instance conference and workshop use.
- Multi-instance scaling would need a different shared storage layer and shared realtime coordination.
