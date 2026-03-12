# Storage System

Nitro `useStorage()` with pluggable driver abstraction.

## Storage Architecture

### Driver Configuration

The storage driver is selected based on the `NITRO_PRESET` environment variable:

- **Cloudflare Workers** (`NITRO_PRESET=cloudflare-module`): Cloudflare KV binding `STAGE_FLOW_DATA`.
- **Node.js / Docker** (any other preset): Filesystem driver at `.data/db/`.
- **Local dev** (`pnpm dev`): Always filesystem at `.data/db/` via `devStorage`.

Configuration in `nuxt.config.ts`:

```typescript
const isCloudflare = process.env.NITRO_PRESET?.startsWith('cloudflare')

nitro: {
  storage: isCloudflare
    ? { data: { driver: 'cloudflareKVBinding', binding: 'STAGE_FLOW_DATA' } }
    : { data: { driver: 'fs', base: './.data/db' } },
  devStorage: {
    data: { driver: 'fs', base: './.data/db' },
  },
}
```

### Storage Keys

All data is accessed via `useStorage('data')` with these keys:

| Key          | Content                   |
| ------------ | ------------------------- |
| `questions`  | `Question[]` array        |
| `answers`    | `Answer[]` array          |
| `admin`      | `{ username, password }`  |
| `emoji:<id>` | Emoji cooldown timestamps |

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

### Predefined Questions Loading (Node.js / Docker Only)

On Node.js runtimes the startup plugin checks for `data/predefined-questions.json`:

1. Renames the file to `.processing` to prevent re-processing.
1. Validates and merges new questions into storage.
1. Deletes the `.processing` file on success.

On Cloudflare Workers, the filesystem is not available. Seed questions directly into KV using `wrangler kv key put`. See [deployment-cloudflare.md](deployment-cloudflare.md#loading-predefined-questions).

### Data Access Patterns

- **Async reads/writes** via `useStorage('data').getItem()` / `.setItem()`.
- **No file locking needed** - KV handles consistency; filesystem driver serializes within a single Node.js process.
- **IDs generated** with `@paralleldrive/cuid2`.

## Maintenance

### Backup (Docker / Node.js)

```bash
# Manual backup of local storage
cp -r .data/db/ backups/data-$(date +%Y%m%d)
```

### Backup (Cloudflare KV)

```bash
# Export all keys
npx wrangler kv key list --binding=STAGE_FLOW_DATA
npx wrangler kv key get --binding=STAGE_FLOW_DATA "questions"
npx wrangler kv key get --binding=STAGE_FLOW_DATA "answers"
```

### Data Reset (Docker / Node.js)

```bash
# Full reset
rm -rf .data/db/
# Application recreates defaults on next start
```

### Data Reset (Cloudflare KV)

```bash
npx wrangler kv key delete --binding=STAGE_FLOW_DATA "questions"
npx wrangler kv key delete --binding=STAGE_FLOW_DATA "answers"
npx wrangler kv key delete --binding=STAGE_FLOW_DATA "admin"
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

### Filesystem Driver (Dev / Docker)

- **Read Speed** - < 1ms for typical files
- **Write Speed** - < 10ms for updates
- **Concurrent Users** - 100-500 comfortable range

### Cloudflare KV

- **Read Latency** - ~10ms (cached at edge)
- **Write Latency** - ~50ms (eventually consistent, ~60s propagation)
- **Concurrent Users** - 100-500+ comfortable range
- **KV is eventually consistent** - acceptable for a quiz tool where slight delays in data propagation do not affect the user experience
