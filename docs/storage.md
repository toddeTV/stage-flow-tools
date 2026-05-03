# Storage System

This project stores quiz data through Nitro `useStorage('data')` on the local filesystem.

## Storage Architecture

The active driver is the filesystem driver at `.data/db/` for local development, Docker, and direct Node.js runtime use.

Configuration in `nuxt.config.ts`:

```typescript
nitro: {
  storage: {
    data: { driver: 'fs', base: './.data/db' },
  },
  devStorage: {
    data: { driver: 'fs', base: './.data/db' },
  },
}
```

## Storage Keys

All data is accessed through `useStorage('data')` with these keys:

| Key         | Content                  |
| ----------- | ------------------------ |
| `questions` | `Question[]`             |
| `answers`   | `Answer[]`               |
| `admin`     | `{ username, password }` |

## Initialization

- `initStorage()` creates missing default values.
- `server/plugins/init-storage.ts` runs that initialization on server startup.
- The same plugin imports `data/predefined-questions.json` when that file exists.
- Emoji cooldown state stays in server memory and is not part of persisted storage.

## Predefined Questions Loading

On startup the plugin checks for `data/predefined-questions.json`.

1. Rename the file to `data/predefined-questions.json.processing`.
1. Parse the file.
1. Merge unseen questions into stored quiz data.
1. Delete the `.processing` file after a successful import.

If parsing fails or a validation rule blocks the import, the `.processing` file stays on disk for manual inspection.

## Maintenance

Backup local storage:

```bash
cp -r .data/db/ backups/data-$(date +%Y%m%d)
```

Reset all stored quiz data:

```bash
rm -rf .data/db/
```

The application recreates defaults on next start.

## Production Mounts

- Docker deployments must persist `/app/.data`.
- Direct Node.js deployments must persist the project `.data/` directory.

## Performance Notes

- Reads and writes are local filesystem operations.
- Current architecture is fine for single-instance conference and workshop use.
- Multi-instance scaling would need a different shared storage layer and shared realtime coordination.
