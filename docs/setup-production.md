# Production Deployment

Guide for running the quiz application in production.

## Supported Path

Docker is the supported production deployment path for this project.

See [deployment-docker.md](deployment-docker.md) for the full server setup.

## Build Output

```bash
vp run build:ssr
```

This creates the production server bundle in `.output/`.

## Docker Deployment

The repository already includes a `Dockerfile` and `docker-compose.yml`.

Production storage lives in `.data/db/stage-flow-tools.sqlite3`, so mount `/app/.data` to persistent host storage.

```bash
docker compose up --build -d
```

## Secondary Self-Hosted Runtime

If Docker is not available in your environment, you can run the built Node.js server directly.

Requirements:

- Node.js `24.x`
- A process manager such as `pm2`
- Persistent storage for `.data/`

Example:

```bash
vp run build:ssr
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

- Check API availability with `/api/questions`.
- Read container or process logs from stdout.
- Watch WebSocket connection counts in the admin connection endpoint when needed.
- Verify `/admin/database` after login if you need database inspection in production.

## Backup Strategy

Manual backup:

```bash
tar -czf quiz-backup-$(date +%Y%m%d).tar.gz .data/
```
