# Cloudflare Deployment Guide

Deploy the application to Cloudflare Pages with Workers for the server-side API and WebSocket support.

> **Status: Migration Required**<br>
> The current codebase uses Node.js-specific APIs that are incompatible with Cloudflare Workers. This guide documents both the target setup and the required migration steps. See the [Migration Roadmap](#migration-roadmap) section for what needs to change before a Cloudflare deployment is possible.

## Why Cloudflare?

- **Zero infrastructure** - no servers to manage, patch, or monitor.
- **Global edge network** - low latency for audiences worldwide.
- **Automatic SSL** - HTTPS out of the box on your custom domain.
- **Free tier** - generous limits for small-to-medium events.
- **WebSocket support** - via Durable Objects (stateful, single-instance coordination).

## Architecture on Cloudflare

```text
Browser (SPA)
  |
  +-- Static assets --> Cloudflare Pages (CDN)
  |
  +-- /api/* requests --> Cloudflare Pages Functions (Workers)
  |                          |
  |                          +-- reads/writes --> Cloudflare KV (storage)
  |                          +-- JWT auth    --> Web Crypto API
  |
  +-- /_ws (WebSocket) --> Cloudflare Durable Objects (stateful WS coordination)
```

- **Cloudflare Pages** serves the SPA static files and runs server-side API routes as Pages Functions (Workers).
- **Cloudflare KV** replaces the file-based JSON storage for questions, answers, and admin data.
- **Cloudflare Durable Objects** provide stateful WebSocket coordination (peer management, broadcasting, results buffering).

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up).
- A domain or subdomain managed by Cloudflare DNS (or a `.pages.dev` subdomain).
- [Node.js 24.x](https://nodejs.org/) and [pnpm 10.x](https://pnpm.io/) installed locally.
- [`wrangler` CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed globally or as a dev dependency.

## Setup Instructions

### 1. Install wrangler

```bash
pnpm add -D wrangler
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser window to authorize `wrangler` with your Cloudflare account.

### 3. Create a KV namespace

Create KV namespaces for storing application data:

```bash
npx wrangler kv namespace create STAGE_FLOW_DATA
npx wrangler kv namespace create STAGE_FLOW_DATA --preview
```

Note the `id` values from the output - they go into `wrangler.toml`.

### 4. Create wrangler.toml

Create a `wrangler.toml` in the project root:

```toml
name = "stage-flow-tools"
compatibility_date = "2025-07-15"
pages_build_output_dir = ".output/public"

[vars]
NUXT_ADMIN_USERNAME = "admin"
NUXT_PUBLIC_EMOJI_COOLDOWN_MS = "1500"

# Secrets (set via `wrangler secret put`):
# NUXT_ADMIN_PASSWORD
# NUXT_JWT_SECRET

[[kv_namespaces]]
binding = "STAGE_FLOW_DATA"
id = "<your-kv-namespace-id>"
preview_id = "<your-preview-kv-namespace-id>"
```

### 5. Set secrets

Never put passwords or JWT secrets in `wrangler.toml`. Use Wrangler secrets:

```bash
npx wrangler secret put NUXT_ADMIN_PASSWORD
npx wrangler secret put NUXT_JWT_SECRET
```

You will be prompted to enter the values interactively.

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

### 6. Configure Nitro preset

In `nuxt.config.ts`, add the Cloudflare Pages preset:

```typescript
export default defineNuxtConfig({
  nitro: {
    preset: "cloudflare-pages",
    experimental: {
      websocket: true,
    },
  },
  // ... rest of config
});
```

### 7. Build for Cloudflare

```bash
pnpm run build:ssr
```

The output will be in `.output/` configured for the Cloudflare Pages preset.

### 8. Deploy

```bash
npx wrangler pages deploy .output/public --project-name=stage-flow-tools
```

Or connect your GitHub repository to Cloudflare Pages for automatic deployments:

1. Go to Cloudflare Dashboard > Pages > Create a project.
1. Connect your GitHub repository.
1. Set build command: `pnpm run build:ssr`.
1. Set build output directory: `.output/public`.
1. Add environment variables in the Cloudflare Pages settings (same as your `.env` values).

### 9. Custom domain

1. In Cloudflare Dashboard > Pages > your project > Custom domains.
1. Add your domain (e.g., `quiz.your-domain.com`).
1. Cloudflare automatically provisions SSL and configures DNS.

## Migration Roadmap

The following components must be migrated before the application can run on Cloudflare Workers. Each item is a blocking incompatibility.

### 1. Storage layer: `fs` to Cloudflare KV

**Problem:** `server/utils/storage.ts` uses Node.js `fs` module (`fs.readFile`, `fs.writeFile`, `fs.mkdir`, `fs.rename`, `fs.unlink`) and `proper-lockfile` for file-based JSON storage. Cloudflare Workers have no filesystem.

**Solution:** Replace all `fs` operations with Cloudflare KV bindings or Nitro's `useStorage()` with a KV driver.

**Approach:**

```typescript
// Before (Node.js filesystem):
import { promises as fs } from "fs";
const data = await fs.readFile(QUESTIONS_FILE, "utf-8");
const questions = JSON.parse(data);

// After (Nitro useStorage with KV):
const storage = useStorage("data");
const questions = (await storage.getItem<Question[]>("questions")) || [];
```

Nitro's `useStorage()` has built-in drivers for Cloudflare KV. Configure in `nuxt.config.ts`:

```typescript
nitro: {
  storage: {
    data: {
      driver: 'cloudflareKVBinding',
      binding: 'STAGE_FLOW_DATA',
    },
  },
}
```

**What changes:**

- Remove `proper-lockfile` dependency (KV handles consistency).
- Remove all `fs` imports and file path constants.
- Replace JSON file read/write with `useStorage()` get/set operations.
- KV is eventually consistent - acceptable for a quiz tool, but be aware of it.

### 2. JWT authentication: `jsonwebtoken` to Web Crypto API

**Problem:** `server/utils/auth.ts` uses the `jsonwebtoken` npm package, which depends on Node.js built-in `crypto` module. This does not run in Cloudflare Workers.

**Solution:** Replace with the Web Crypto API (available in Workers) or use a Workers-compatible JWT library like `jose`.

**Approach:**

```typescript
// Before (jsonwebtoken - Node.js only):
import jwt from "jsonwebtoken";
const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });

// After (jose - works in Workers):
import { jwtVerify, SignJWT } from "jose";
const secret = new TextEncoder().encode(config.jwtSecret);
const { payload } = await jwtVerify(token, secret);
```

### 3. WebSockets: Durable Objects for stateful coordination

**Problem:** The WebSocket implementation uses in-memory `Map` objects (`peers` map in `server/utils/websocket.ts`) to track connected clients. Cloudflare Workers are stateless - each request may hit a different isolate, so in-memory state is lost between requests.

**Solution:** Use [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) for WebSocket coordination. Durable Objects provide a single-instance, stateful execution context that can hold WebSocket connections and broadcast messages.

**What changes:**

- Create a Durable Object class that manages WebSocket peers, broadcasting, and results buffering.
- Route `/_ws` connections to the Durable Object instead of using Nitro's built-in WebSocket handler.
- The buffered results update (`scheduleResultsUpdate` with `setTimeout`) works inside Durable Objects since they support `setTimeout`.

**Architecture note:** Cloudflare Pages cannot define Durable Object classes directly. The DO class must live in a separate Worker project. You then bind it into your Pages project via `wrangler.toml` using `script_name`, `class_name`, and a `[[durable_objects.bindings]]` declaration. During local development, this means running the DO Worker (`npx wrangler dev`) and the Pages project (`npx wrangler pages dev`) concurrently.

**Note:** SQLite-backed Durable Objects are available on the free plan. Only key-value-backed Durable Objects require a paid Workers plan ($5/month minimum).

### 4. CUID2 ID generation

**Problem:** `@paralleldrive/cuid2` uses Node.js `crypto.getRandomValues`. This is available in Cloudflare Workers, but verify compatibility with the current version (`~2.2.2`).

**Likely OK:** Recent versions of `cuid2` use the Web Crypto API, which Workers support. Test to confirm.

### 5. Predefined questions loading

**Problem:** The startup logic in `initStorage()` reads/renames/deletes files in `data/`. This filesystem-based flow does not translate to KV.

**Solution:** Use a KV-based equivalent. Store a "processed" flag in KV to prevent re-processing. Use Wrangler to seed initial data:

```bash
npx wrangler kv key put --binding=STAGE_FLOW_DATA "questions" '[...]'
```

### Summary of migration effort

| Component                      | Difficulty  | Notes                                       |
| ------------------------------ | ----------- | ------------------------------------------- |
| Storage (`fs` to KV)           | Medium      | Core change, affects all CRUD operations    |
| JWT (`jsonwebtoken` to `jose`) | Low         | Drop-in replacement, few lines of code      |
| WebSockets (Durable Objects)   | High        | Requires new Durable Object class + routing |
| CUID2                          | Likely none | Should work, needs verification             |
| Predefined questions           | Low         | Replace file operations with KV seeding     |

## Environment Variables on Cloudflare

Set these in the Cloudflare Pages dashboard under Settings > Environment variables:

| Variable                        | Secret? | Description                                        |
| ------------------------------- | ------- | -------------------------------------------------- |
| `NUXT_ADMIN_USERNAME`           | No      | Admin login username                               |
| `NUXT_ADMIN_PASSWORD`           | Yes     | Admin login password                               |
| `NUXT_JWT_SECRET`               | Yes     | JWT signing secret (use `openssl rand -base64 48`) |
| `NUXT_PUBLIC_EMOJI_COOLDOWN_MS` | No      | Emoji cooldown in ms (default: `1500`)             |

Public variables (`NUXT_PUBLIC_*`) are embedded at build time. Private variables are available only in Workers at runtime.

## Cost Considerations

| Resource                        | Free tier                           | Paid plan                     |
| ------------------------------- | ----------------------------------- | ----------------------------- |
| Pages                           | 500 builds/month, 100K requests/day | $5/month for more             |
| Workers                         | 100K requests/day                   | $5/month (10M requests/month) |
| KV                              | 100K reads/day, 1K writes/day       | $0.50/M reads, $5/M writes    |
| Durable Objects (SQLite-backed) | Free                                | Included                      |
| Durable Objects (KV-backed)     | Not available on free tier          | $5/month minimum              |

For a typical conference quiz with 100-500 participants, the free tier is sufficient. SQLite-backed Durable Objects for WebSocket coordination are available on the free plan.
