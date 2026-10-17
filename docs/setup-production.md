# Production Deployment

Guide for running the quiz application in production.

## Supported Path

Docker is the supported production deployment path for this project.

See [deployment-docker.md](deployment-docker.md) for the full server setup.

## Build Output

```bash
vp run build
```

This creates the production server bundle in `.output/`.

## Docker Deployment

The repository includes a `Dockerfile`. Create and maintain a
deployment-specific Compose file outside the repository; see the
[Docker Deployment Guide](deployment-docker.md#3-configure-docker-compose).

Production storage lives in `.data/db/stage-flow-tools.sqlite3`, so mount `/app/.data` to persistent host storage.

Before making the deployment public, add its own legal notice and privacy
policy to the migrated database. See [Deployment-Specific Legal
Documents](legal-texts.md).

```bash
docker compose --file <compose-file> up --detach
```

## Secondary Self-Hosted Runtime

If Docker is not available in your environment, you can run the built Node.js server directly.

Requirements:

- Node.js `26.x`
- A process manager such as `pm2`
- Persistent storage for `.data/`

Example:

```bash
vp run build
pm2 start .output/server/index.mjs --name stage-flow-tools
```

## Environment Configuration

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

Set production values for:

- `NUXT_ADMIN_USERNAME`
- `NUXT_ADMIN_PASSWORD`
- `NUXT_ADMIN_TOKEN` when external software needs admin bearer-token access or tokenized `/admin?...` page access
- `NUXT_JWT_SECRET`
- `NUXT_DRIZZLE_STUDIO_INTERNAL_PORT` when you need a non-default private Studio worker port

Leave `NUXT_ADMIN_TOKEN` empty if you do not want static admin-token authentication. If you set it, keep it secret and rotate it by updating the environment and redeploying.

Admin authentication variants in production:

1. Human admins log in through `/login` with `NUXT_ADMIN_USERNAME` and `NUXT_ADMIN_PASSWORD`.
2. External software can call admin APIs with `Authorization: Bearer <token>`.
3. External software can open protected `/admin` pages with `?token=<token>` when an iframe or browser context is required.

Prefer variant 1 for people, variant 2 for server-to-server API calls, and variant 3 only for embedded admin pages that cannot attach custom HTTP headers.

## Data Persistence

- Quiz data is stored in SQLite at `.data/db/stage-flow-tools.sqlite3`.
- Docker deployments must keep `/app/.data` on a persistent mount.
- Direct Node.js deployments must keep the project `.data/` directory on persistent disk.

## Monitoring

- Check public API availability with `GET /api/questions/active`: expect HTTP `200`
  with the active question or `{ "message": "No active question" }`. No active
  question is a valid state, not a failed health check.
- Check the protected question list with `GET /api/questions` using a valid admin
  session cookie or bearer token: expect HTTP `200`. Without credentials, expect
  HTTP `401`; this response alone does not indicate an outage. See
  [authentication](api.md#authentication).
- Verify realtime delivery separately: open a participant page and an authenticated
  results page, confirm their `/_ws/default` connections upgrade with HTTP `101`
  and stay open, then publish a test question and submit an answer. Confirm the
  participant receives the question and the results page receives the voting update.
  Run this functional check with test data outside a live quiz; an HTTP check alone
  does not verify WebSocket delivery.
- Read container or process logs from stdout.
- Watch WebSocket connection counts in the admin connection endpoint when needed.
- Verify `/admin/database` after login if you need database inspection in production.

## Backup Strategy

Follow the canonical [backup](storage.md#backup) and [restore](storage.md#restore)
instructions. Stop the application and all other database connections before copying
the complete persistent data directory. In Docker, use the host directory mounted
at `/app/.data`. Keep the application version associated with each backup for restore.
