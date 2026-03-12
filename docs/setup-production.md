# Production Deployment

Guide for deploying the quiz application to production.

## Build Process

### Production Build

```bash
pnpm run build:ssr
```

Creates optimized production bundle in `.output/` directory.

## Deployment Options

### 1. Cloudflare Workers (Primary)

See the [Cloudflare Deployment Guide](deployment-cloudflare.md) for a step-by-step tutorial covering manual deploys, automated CI/CD via GitHub Actions, and the push script for seeding quiz data.

```bash
pnpm run deploy:cloudflare
```

### 2. Docker Container

See the [Docker Deployment Guide](deployment-docker.md).

**Dockerfile example:**

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY .output .output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

### 3. Node.js Server (VPS/Dedicated)

**Requirements:**

- Node.js 24.x
- PM2 or similar process manager

**Steps:**

1. Build application
2. Copy `.output/` to server
3. Set environment variables
4. Start with PM2:
   ```bash
   pm2 start .output/server/index.mjs --name quiz-app
   ```

### 4. Platform-as-a-Service

**Vercel:**

- Note: File storage is ephemeral
- Consider external database for persistence

**Railway/Render:**

- Full Node.js support
- Persistent file storage available

## Environment Configuration

### Production Variables

**Generate a strong JWT secret:**

```bash
openssl rand -base64 48
```

Store the generated secret in your environment management system or secrets manager to fill `NUXT_JWT_SECRET` in production (e.g., AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets, or your platform's environment variable manager).

### Security Considerations

- **Strong Passwords**: Use complex admin credentials
- **JWT Secret**: Generate secure random string using `openssl rand -base64 48` and store it securely
- **Secret Management**: Never commit secrets to source control; use environment management or a secrets manager
- **HTTPS**: Always use SSL in production
- **Firewall**: Configure appropriate rules

## Data Persistence

### Cloudflare Workers

Data is stored in Cloudflare KV - persists across deployments, globally replicated.

### Docker / Node.js

Data is stored in `.data/db/` on the local filesystem.

**Ephemeral Platforms** (Vercel, some PaaS):

- Data resets on redeploy
- Not suitable for production quiz data

**Persistent Platforms** (VPS, dedicated servers, Docker):

- Data persists in `.data/db/` across restarts
- Regular backups recommended

### Migration to Database

For high-availability production:

1. Consider PostgreSQL/MySQL
2. Use cloud database services
3. Implement proper backup strategy

## Monitoring

### Health Check Endpoint

Access `/api/questions` to verify API availability.

### Logs

- Application logs to stdout
- Use platform logging services
- Monitor WebSocket connections

## Scaling Considerations

### Single Instance

Current architecture supports:

- ~100-500 concurrent users
- One active question at a time
- File-based storage

### Multi-Instance

For larger scale:

- Implement Redis for session/WebSocket sync
- Use external database
- Load balancer configuration

## Backup Strategy

### Automated Backups

Schedule cron job (Docker / Node.js):

```bash
0 */6 * * * cp -r /app/.data/db /backups/data-$(date +\%Y\%m\%d-\%H\%M)
```

### Manual Backup

Before updates:

```bash
tar -czf quiz-backup-$(date +%Y%m%d).tar.gz data/
```
