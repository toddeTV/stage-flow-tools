# Production Deployment

Guide for deploying the quiz application to production on Cloudflare Workers.

## Build and Deploy

```bash
pnpm run deploy:cloudflare
```

This runs `nuxt build` with `NITRO_PRESET=cloudflare-module` and deploys via `wrangler deploy`.

See the [Cloudflare Deployment Guide](deployment-cloudflare.md) for a step-by-step tutorial covering manual deploys, automated CI/CD via GitHub Actions, and the push script for seeding quiz data.

## Environment Configuration

### Production Variables

Set secrets securely via Wrangler (never commit to source control):

```bash
openssl rand -base64 48  # Generate a strong JWT secret
npx wrangler secret put NUXT_ADMIN_PASSWORD
npx wrangler secret put NUXT_JWT_SECRET
```

Public variables are configured in `wrangler.toml` under `[vars]`.

### Security Considerations

- **Strong Passwords**: Use complex admin credentials
- **JWT Secret**: Generate secure random string using `openssl rand -base64 48`
- **Secret Management**: Never commit secrets to source control; use `npx wrangler secret put`
- **HTTPS**: Automatic via Cloudflare

## Data Persistence

Data is stored in Cloudflare KV - persists across deployments, globally replicated.

WebSocket state (connections, emoji cooldowns, results batching) is managed by the `QuizSession` Durable Object in transient memory. This state is ephemeral but re-establishes automatically as clients reconnect.

## Monitoring

### Health Check Endpoint

Access `/api/questions` to verify API availability (requires admin auth).

### Logs

- Application logs via `wrangler tail`
- Cloudflare Dashboard for Workers analytics
- Monitor Durable Object metrics via CF dashboard

## Backup Strategy

### KV Backup

```bash
backup_dir="backups/kv-$(date +%Y%m%d)"
mkdir -p "$backup_dir"
npx wrangler kv key get --binding=STAGE_FLOW_DATA "questions" > "$backup_dir/questions.json"
npx wrangler kv key get --binding=STAGE_FLOW_DATA "answers" > "$backup_dir/answers.json"
```

### Push Script

For conference speakers maintaining questions in a separate repo:

```bash
pnpm run deploy:push-to-cloudflare -- --questions ./my-questions.json
```

See [deployment-cloudflare.md](deployment-cloudflare.md#pushing-questions-from-local-to-cloudflare) for the full reference.
