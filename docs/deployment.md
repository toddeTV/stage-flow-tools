# Deployment

This application deploys to **Cloudflare Workers** with Durable Objects for real-time WebSocket management and KV for persistent storage. Zero infrastructure management, automatic SSL, global edge network.

Automated CI/CD via GitHub Actions deploys on every merge to `main` and resets quiz data for a clean start.

- [Cloudflare Deployment Guide](deployment-cloudflare.md)

## Architecture

| Aspect          | Details                                                      |
| --------------- | ------------------------------------------------------------ |
| Compute         | Cloudflare Workers (serverless)                              |
| Real-time       | Durable Objects with WebSocket Hibernation API               |
| Persistent data | Cloudflare KV (`STAGE_FLOW_DATA` binding)                    |
| Transient state | Durable Object in-memory (emoji cooldowns, results batching) |
| SSL/TLS         | Automatic                                                    |
| Local dev       | `wrangler dev` with filesystem-backed `devStorage`           |
| Cost            | Free tier available (paid plan recommended for KV + DO)      |
