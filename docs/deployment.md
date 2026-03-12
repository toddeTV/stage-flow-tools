# Deployment

This application supports two deployment strategies. Cloudflare is the primary target used for the author's demo instance; Docker is a secondary option for self-hosted setups on your own infrastructure.

## Deployment Options

### 1. Cloudflare (Primary)

Deploy as a Cloudflare Worker with KV storage for data persistence. Zero infrastructure management, automatic SSL, global edge network, and WebSocket support. Automated CI/CD via GitHub Actions deploys on every merge to `main` and resets quiz data for a clean start.

- [Cloudflare Deployment Guide](deployment-cloudflare.md)

### 2. Docker (Secondary)

Self-host on any Linux server using Docker Compose with a Traefik reverse proxy. Full control over infrastructure, data stays on your machine, works behind corporate firewalls.

- [Docker Deployment Guide](deployment-docker.md)

## Comparison

| Aspect           | Cloudflare                        | Docker                           |
| ---------------- | --------------------------------- | -------------------------------- |
| Infrastructure   | Managed (zero servers)            | Self-managed Linux server        |
| SSL/TLS          | Automatic                         | Via Traefik + Let's Encrypt      |
| Storage          | Cloudflare KV                     | Local filesystem (`.data/db`)    |
| WebSockets       | In-memory (single Worker isolate) | In-memory (Node.js process)      |
| Scaling          | Automatic edge distribution       | Single instance (manual scaling) |
| Data persistence | Cloud-managed KV store            | Volume-mounted `.data/db`        |
| Cost             | Free tier available (paid for KV) | Server costs                     |
| Current status   | **Ready to use**                  | **Ready to use**                 |
