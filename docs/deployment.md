# Deployment

This application supports two deployment strategies. Cloudflare is the primary target used for the author's demo instance; Docker is a secondary option for self-hosted setups on your own infrastructure.

## Deployment Options

### 1. Cloudflare (Primary)

Deploy to Cloudflare Pages with Workers for the server API and WebSocket support. Zero infrastructure management, automatic SSL, global CDN, and generous free tier.

- [Cloudflare Deployment Guide](deployment-cloudflare.md)

### 2. Docker (Secondary)

Self-host on any Linux server using Docker Compose with a Traefik reverse proxy. Full control over infrastructure, data stays on your machine, works behind corporate firewalls.

- [Docker Deployment Guide](deployment-docker.md)

## Comparison

| Aspect           | Cloudflare                                      | Docker                            |
| ---------------- | ----------------------------------------------- | --------------------------------- |
| Infrastructure   | Managed (zero servers)                          | Self-managed Linux server         |
| SSL/TLS          | Automatic                                       | Via Traefik + Let's Encrypt       |
| Storage          | Cloudflare KV (requires migration)              | Local JSON files on disk          |
| WebSockets       | Cloudflare Durable Objects (requires migration) | Native Node.js WebSockets         |
| Scaling          | Automatic edge distribution                     | Single instance (manual scaling)  |
| Data persistence | Cloud-managed KV store                          | Volume-mounted `./data` directory |
| Cost             | Free tier available                             | Server costs                      |
| Current status   | **Requires migration** (see below)              | **Ready to use**                  |

## Cloudflare Compatibility Notice

The current codebase is built for a Node.js runtime and is **not yet directly compatible** with Cloudflare Workers/Pages. The Docker deployment works out of the box. Deploying to Cloudflare requires migrating several Node.js-specific components first. See the [Cloudflare Deployment Guide](deployment-cloudflare.md) for the full list of required changes and a migration roadmap.
