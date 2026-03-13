# Storage System

Nitro `useStorage()` with Cloudflare KV as the primary storage driver.

## Storage Architecture

### Driver Configuration

- **Cloudflare Workers** (production): Cloudflare KV binding `STAGE_FLOW_DATA`.
- **Local dev** (`pnpm dev`): Filesystem at `.data/db/` via `devStorage`.

Configuration in `nuxt.config.ts`:

```typescript
nitro: {
  storage: {
    data: { driver: 'cloudflareKVBinding', binding: 'STAGE_FLOW_DATA' },
  },
  devStorage: {
    data: { driver: 'fs', base: './.data/db' },
  },
}
```

### Storage Keys

All persistent data is accessed via `useStorage('data')` with these keys:

| Key         | Content                  |
| ----------- | ------------------------ |
| `questions` | `Question[]` array       |
| `answers`   | `Answer[]` array         |
| `admin`     | `{ username, password }` |

### Transient State (Durable Object)

Emoji cooldowns and results batching are managed in the `QuizSession` Durable Object's transient memory - not in KV. This avoids KV write costs for ephemeral data.

| State            | Location                  | Persistence                        |
| ---------------- | ------------------------- | ---------------------------------- |
| Emoji cooldowns  | DO in-memory Map          | Lost on DO eviction (acceptable)   |
| Results buffer   | DO `pendingResults` field | Lost on DO eviction (re-triggered) |
| Connection peers | DO WebSocket Hibernation  | Managed by Cloudflare runtime      |

### Data Models

#### Question Schema

```json
{
  "id": "string (cuid2)",
  "key": "string (unique identifier, defaults to id)",
  "question_text": {
    "en": "string",
    "de": "string (optional)",
    "ja": "string (optional)"
  },
  "answer_options": [
    {
      "text": { "en": "string", "de": "string (optional)" },
      "emoji": "string (optional)"
    }
  ],
  "is_active": "boolean (optional, only one question active at a time)",
  "is_locked": "boolean",
  "createdAt": "ISO 8601 timestamp",
  "alreadyPublished": "boolean",
  "note": { "en": "string (optional)" }
}
```

All text fields (`question_text`, `answer_options[].text`, `note`) use a `LocalizedString` type: an object with a required `en` key and optional locale keys (e.g., `de`, `ja`).

#### Answer Schema

```json
{
  "id": "string (cuid2)",
  "question_id": "string",
  "user_id": "string",
  "user_nickname": "string",
  "selected_answer": { "en": "string" },
  "timestamp": "ISO 8601 timestamp"
}
```

## Storage Operations

### Initialization

- `initStorage()` sets default values for missing keys (empty arrays for questions/answers, default admin credentials from runtime config).
- Called automatically by the Nitro plugin `server/plugins/init-storage.ts` on server startup.
- Idempotent - safe to call multiple times.

### Predefined Questions Loading (Local Dev Only)

During local development the startup plugin checks for `data/predefined-questions.json`:

1. Renames the file to `.processing` to prevent re-processing.
1. Validates and merges new questions into storage.
1. Deletes the `.processing` file on success.

On Cloudflare Workers, the filesystem is not available. Seed questions directly into KV using `wrangler kv key put`. See [deployment-cloudflare.md](deployment-cloudflare.md#loading-predefined-questions).

### Data Access Patterns

- **Async reads/writes** via `useStorage('data').getItem()` / `.setItem()`.
- **No file locking needed** - KV handles consistency; filesystem driver serializes within a single Node.js process.
- **IDs generated** with `@paralleldrive/cuid2`.

## Maintenance

### Backup (Cloudflare KV)

```bash
# Export data to local backup files
backup_dir="backups/kv-$(date +%Y%m%d)"
mkdir -p "$backup_dir"
npx wrangler kv key get --binding=STAGE_FLOW_DATA "questions" > "$backup_dir/questions.json"
npx wrangler kv key get --binding=STAGE_FLOW_DATA "answers" > "$backup_dir/answers.json"
npx wrangler kv key get --binding=STAGE_FLOW_DATA "admin" > "$backup_dir/admin.json"
```

Restore from backup:

```bash
npx wrangler kv key put --binding=STAGE_FLOW_DATA "questions" --path="$backup_dir/questions.json"
npx wrangler kv key put --binding=STAGE_FLOW_DATA "answers" --path="$backup_dir/answers.json"
```

### Backup (Local Dev)

```bash
# Manual backup of local dev storage
cp -r .data/db/ backups/data-$(date +%Y%m%d)
```

### Data Reset (Cloudflare KV)

```bash
npx wrangler kv key delete --binding=STAGE_FLOW_DATA "questions"
npx wrangler kv key delete --binding=STAGE_FLOW_DATA "answers"
npx wrangler kv key delete --binding=STAGE_FLOW_DATA "admin"
```

Alternatively, use the push script to reset and replace data in one step (admin is overridden, never deleted):

```bash
pnpm run deploy:push-to-cloudflare -- --questions ./my-questions.json --admin ./my-admin.json
```

See [deployment-cloudflare.md](deployment-cloudflare.md#pushing-questions-from-local-to-cloudflare) for details.

> The CI/CD workflow (`deploy-cloudflare.yml`) resets `questions` and `answers` to `[]` after every deploy. Admin credentials are preserved.

### Data Reset (Local Dev)

```bash
# Full reset
rm -rf .data/db/
# Application recreates defaults on next start
```

## Migration Path

### To SQLite

1. Export JSON data
2. Create database schema
3. Import data
4. Update storage utilities

### To PostgreSQL

1. Set up database
2. Create tables
3. Migrate JSON data
4. Update connection logic

### To Cloud Storage

- **Supabase** - PostgreSQL with real-time
- **PlanetScale** - Serverless MySQL
- **Turso** - Edge SQLite

## Performance Characteristics

### Cloudflare KV

- **Read Latency** - ~10ms (cached at edge)
- **Write Latency** - ~50ms (eventually consistent, ~60s propagation)
- **Concurrent Users** - 100-500+ comfortable range
- **KV is eventually consistent** - acceptable for a quiz tool where slight delays in data propagation do not affect the user experience

### Local Dev (Filesystem)

- **Read Speed** - < 1ms for typical files
- **Write Speed** - < 10ms for updates
- Used only during `pnpm dev`
