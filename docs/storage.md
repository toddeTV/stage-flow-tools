# Storage System

File-based JSON storage implementation details.

## Storage Architecture

### File Structure

```
data/
├── questions.json    # All quiz questions
├── answers.json      # User responses
└── admin.json        # Admin credentials
```

### Data Models

#### Question Schema

```json
{
  "id": "string",
  "question_text": "string",
  "answer_options": ["string"],
  "is_active": "boolean",
  "is_locked": "boolean",
  "created_at": "ISO 8601 timestamp"
}
```

#### Answer Schema

```json
{
  "id": "string",
  "question_id": "string",
  "user_nickname": "string",
  "selected_answer": "string",
  "timestamp": "ISO 8601 timestamp"
}
```

## Storage Operations

### Initialization

- Auto-creates `/data` directory
- Initializes empty JSON files
- Sets default admin credentials

### Data Access Patterns

- **Synchronous Reads** - Fast file access
- **Atomic Writes** - Complete file replacement
- **In-Memory Caching** - Considered for future

### Concurrency Handling

- **Single-threaded** - Node.js event loop
- **Queue Updates** - Serialized write operations
- **Race Conditions** - Minimal risk in presentation context

## Maintenance

### Backup Commands

```bash
# Manual backup
cp -r data/ backups/data-$(date +%Y%m%d)

# Automated backup (cron)
0 */6 * * * /path/to/backup-script.sh
```

### Data Cleanup

```bash
# Remove old answers (keep questions)
echo "[]" > data/answers.json

# Full reset
rm -rf data/
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

- **Read Speed** - < 1ms for typical files
- **Write Speed** - < 10ms for updates
- **File Size Limits** - ~10MB practical limit
- **Concurrent Users** - 100-500 comfortable range
