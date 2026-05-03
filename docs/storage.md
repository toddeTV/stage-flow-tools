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

## Initialization

- `initStorage()` in `server/utils/storage.ts` applies pending Drizzle migrations on first storage access.
- No bundled seed data is included in the repository.
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

The next runtime access recreates the SQLite database file.

## Production Mounts

- Docker deployments must persist `/app/.data`.
- Direct Node.js deployments must persist the project `.data/` directory.

## Performance Notes

- Reads and writes are local SQLite operations.
- Current architecture is fine for single-instance conference and workshop use.
- Multi-instance scaling would need a different shared storage layer and shared realtime coordination.
