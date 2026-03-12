# Cloudflare Deployment Guide

Step-by-step tutorial for deploying stage-flow-tools to Cloudflare Workers with KV storage.

## What You Get

- **Zero infrastructure** - no servers to manage, patch, or monitor.
- **Global edge network** - low latency for audiences worldwide.
- **Automatic SSL** - HTTPS out of the box on your custom domain.
- **Cloudflare KV** - managed key-value storage for quiz data.
- **WebSocket support** - real-time quiz updates via a single Worker isolate.

## Architecture on Cloudflare

```text
Browser (SPA)
  |
  +-- Static assets --> Cloudflare Worker (serves SPA)
  |
  +-- /api/* requests --> Cloudflare Worker
  |                          |
  |                          +-- reads/writes --> Cloudflare KV (storage)
  |                          +-- JWT auth    --> jose (Web Crypto API)
  |
  +-- /_ws (WebSocket) --> Cloudflare Worker (in-memory peer management)
```

- The **Cloudflare Worker** serves the SPA, handles API routes, and manages WebSocket connections in a single isolate.
- **Cloudflare KV** stores questions, answers, and admin credentials (replaces the local filesystem driver used in Docker/Node.js deployments).
- **WebSocket state** (connected peers, broadcasting) is held in-memory within the Worker isolate. This works because all connections route to the same isolate.

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) with a **paid Workers plan** (required for KV write access beyond the free tier limits).
- A domain or subdomain managed by Cloudflare DNS (or use the default `.workers.dev` subdomain).
- [Node.js 24.x](https://nodejs.org/) and [pnpm 10.x](https://pnpm.io/) installed locally.

## Tutorial

### Step 1: Clone and Install

```bash
git clone https://github.com/toddeTV/stage-flow-tools.git
cd stage-flow-tools
pnpm install
```

`wrangler` is already included as a dev dependency - no global install needed.

### Step 2: Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser window. Authorize the Wrangler CLI with your Cloudflare account.

### Step 3: Create a KV Namespace

KV stores all quiz data (questions, answers, admin credentials).

```bash
npx wrangler kv namespace create STAGE_FLOW_DATA
```

Note the `id` from the output. You need it in the next step.

For local development with Wrangler, create a preview namespace too:

```bash
npx wrangler kv namespace create STAGE_FLOW_DATA --preview
```

Note the `preview_id`.

### Step 4: Create wrangler.toml

Copy the provided example and fill in your KV namespace IDs:

```bash
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml` and replace the placeholder values:

```toml
name = "stage-flow-tools"
main = ".output/server/index.mjs"
compatibility_date = "2025-07-15"

[vars]
NUXT_ADMIN_USERNAME = "admin"
NUXT_PUBLIC_EMOJI_COOLDOWN_MS = "1500"

# Secrets (set via `npx wrangler secret put`):
# NUXT_ADMIN_PASSWORD
# NUXT_JWT_SECRET

[[kv_namespaces]]
binding = "STAGE_FLOW_DATA"
id = "<paste-your-kv-namespace-id-here>"
preview_id = "<paste-your-preview-kv-namespace-id-here>"
```

> `wrangler.toml` is gitignored because it contains your namespace IDs. Each deployment maintains its own copy.

### Step 5: Set Secrets

Secrets are stored securely in Cloudflare and never committed to source control.

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

Set the required secrets:

```bash
npx wrangler secret put NUXT_ADMIN_PASSWORD
npx wrangler secret put NUXT_JWT_SECRET
```

You will be prompted to enter each value interactively.

### Step 6: Build for Cloudflare

```bash
pnpm run build:cloudflare
```

This runs `nuxt build` with `NITRO_PRESET=cloudflare-module`, producing a Worker-compatible bundle in `.output/`.

### Step 7: Deploy

```bash
npx wrangler deploy
```

Wrangler uploads the Worker and prints the deployment URL (e.g., `https://stage-flow-tools.<your-subdomain>.workers.dev`).

You can combine build and deploy in one command:

```bash
pnpm run deploy:cloudflare
```

### Step 8: Verify the Deployment

Open the deployment URL in your browser. You should see the quiz landing page.

Test the admin login:

1. Navigate to `/login`.
1. Enter the username and password you configured.
1. You should be redirected to the admin dashboard.

### Step 9: Custom Domain (Optional)

1. Go to **Cloudflare Dashboard > Workers & Pages > your Worker > Settings > Domains & Routes**.
1. Add your domain (e.g., `quiz.your-domain.com`).
1. Cloudflare automatically provisions SSL and configures DNS.

## Loading Predefined Questions

On Node.js/Docker deployments, predefined questions load automatically from a JSON file on disk at startup. On Cloudflare Workers, the filesystem is not available, so you seed questions directly into KV.

### Seeding via Wrangler CLI

Prepare your questions as a JSON array and write them to KV:

```bash
npx wrangler kv key put --binding=STAGE_FLOW_DATA "questions" '[
  {
    "id": "q1",
    "key": "fav-color",
    "question_text": {"en": "What is your favorite color?"},
    "answer_options": [
      {"text": {"en": "Red"}},
      {"text": {"en": "Green"}, "emoji": "💚"},
      {"text": {"en": "Blue"}}
    ],
    "is_locked": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "alreadyPublished": false
  }
]'
```

For larger datasets, use a file:

```bash
npx wrangler kv key put --binding=STAGE_FLOW_DATA "questions" --path=./my-questions.json
```

The JSON format matches the `Question[]` schema documented in [storage.md](storage.md).

### Initializing Admin Credentials

The admin credentials are set via environment variables (`NUXT_ADMIN_USERNAME` in `wrangler.toml`, `NUXT_ADMIN_PASSWORD` as a secret). The storage layer initializes default admin data automatically on first request if no admin entry exists in KV.

## Environment Variables

| Variable                        | Where to set              | Description                                        |
| ------------------------------- | ------------------------- | -------------------------------------------------- |
| `NUXT_ADMIN_USERNAME`           | `wrangler.toml` `[vars]`  | Admin login username                               |
| `NUXT_ADMIN_PASSWORD`           | `npx wrangler secret put` | Admin login password                               |
| `NUXT_JWT_SECRET`               | `npx wrangler secret put` | JWT signing secret (use `openssl rand -base64 48`) |
| `NUXT_PUBLIC_EMOJI_COOLDOWN_MS` | `wrangler.toml` `[vars]`  | Emoji cooldown in ms (default: `1500`)             |

Public variables (`NUXT_PUBLIC_*`) are embedded at build time. Private variables are available only at Worker runtime.

## Updating Your Deployment

To deploy a new version:

```bash
git pull
pnpm install
pnpm run deploy:cloudflare
```

KV data persists across deployments - your questions and answers are not lost when you redeploy.

## Troubleshooting

### Build Fails

- Verify Node.js 24.x and pnpm 10.x are installed.
- Run `pnpm install` to make sure dependencies are up to date.
- Check that `NITRO_PRESET=cloudflare-module` is set (the `build:cloudflare` script handles this).

### KV Data Not Found

- Confirm the KV namespace ID in `wrangler.toml` matches the one from `npx wrangler kv namespace list`.
- Verify the binding name is `STAGE_FLOW_DATA` (must match `nuxt.config.ts`).

### WebSocket Connection Issues

- The Worker serves WebSocket connections at `/_ws`. Verify your client connects to the correct URL.
- Cloudflare Workers support WebSocket connections natively via the `cloudflare-module` preset.

### Secrets Not Working

- Re-run `npx wrangler secret put <NAME>` to update a secret.
- Secrets are per-environment. If you use preview vs. production environments, set secrets for each.

## Cost Considerations

| Resource   | Free tier         | Paid plan ($5/month)  |
| ---------- | ----------------- | --------------------- |
| Workers    | 100K requests/day | 10M requests/month    |
| KV reads   | 100K reads/day    | 10M reads/month       |
| KV writes  | 1K writes/day     | 1M writes/month       |
| KV storage | 1 GB              | 1 GB (more available) |

For a typical conference quiz with 100-500 participants, a paid plan ($5/month) provides comfortable headroom.
