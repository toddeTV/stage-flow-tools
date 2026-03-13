# Architecture Overview

System design and technical architecture of the quiz application.

## Tech Stack

### Frontend

- **Nuxt 4** - Vue meta-framework
- **Vue 3** - Composition API
- **Tailwind CSS** - Utility-first CSS framework

### Backend

- **Nitro** - Nuxt server engine
- **Cloudflare Durable Objects** - Real-time WebSocket management via the WebSocket Hibernation API
- **Cloudflare KV** - Persistent data storage
- **JWT** - Authentication tokens

### Deployment

- **Cloudflare Workers** - Serverless compute (only supported deployment target)

## Application Structure

```text
stage-flow-tools/
├── app/                # Frontend application
│   ├── components/     # Vue components (ui/, app/)
│   ├── composables/    # Vue composables
│   ├── layouts/        # Nuxt layouts
│   ├── middleware/      # Route middleware
│   ├── pages/          # Route components
│   ├── utils/          # Client utilities
│   └── app.vue         # Root component
├── cloudflare/         # Cloudflare-specific code (outside Nitro)
│   └── quiz-session.ts # QuizSession Durable Object class
├── server/             # Backend services (Nitro)
│   ├── api/            # REST endpoints
│   ├── routes/         # WebSocket upgrade handler
│   └── utils/          # Server utilities (storage, auth, DO proxy)
├── shared/             # Shared code (client + server)
│   └── utils/          # Shared utilities
├── worker-entry.ts     # Cloudflare Worker entry (re-exports Nitro + DO)
├── .data/db/           # Local storage (dev only, gitignored)
├── data/               # Predefined questions source (local dev only)
└── docs/               # Project documentation
```

## Core Components

### Pages

- **`index.vue`** - Main quiz interface
- **`login.vue`** - Admin login
- **`admin/index.vue`** - Admin overview with links to sub-pages
- **`admin/questions.vue`** - Question management
- **`admin/results.vue`** - Results display
- **`admin/leaderboard.vue`** - Admin leaderboard
- **`admin/emojis.vue`** - Emoji overlay

### API Routes

- **`/auth/*`** - Authentication endpoints
- **`/questions/*`** - Question management
- **`/answers/*`** - Answer submission
- **`/results/*`** - Results retrieval
- **`/emojis/*`** - Emoji reactions
- **`/websockets/*`** - Connection monitoring

### Durable Object

- **`QuizSession`** (`cloudflare/quiz-session.ts`) - Manages all WebSocket connections via the Hibernation API. Handles broadcasting, per-user message delivery, emoji cooldowns (in-memory), and results batching (alarm API with 2-second delay). A single instance (`idFromName('global')`) serves all channels.

### Worker Entry

- **`worker-entry.ts`** - Cloudflare Worker entry point. Re-exports the Nitro-generated fetch handler as the default export and the `QuizSession` Durable Object class. Referenced by `wrangler.toml` as `main`.

## Design Decisions

### Why Cloudflare Durable Objects?

- **Persistent WebSocket state** - Connection tracking survives Worker isolate eviction, unlike in-memory Maps
- **WebSocket Hibernation API** - Efficient connection management without keeping the DO awake for idle connections
- **Alarm API** - Built-in timer for batched results updates (2-second delay)
- **Transient state** - Emoji cooldowns live in DO memory (no KV writes needed)
- **Single instance** - One `QuizSession` DO handles all WebSocket channels (default, results, emojis)

### Why Nitro useStorage()?

- **KV binding** - Cloudflare KV via `STAGE_FLOW_DATA` binding for persistent data
- **Dev storage** - Filesystem driver at `.data/db/` via `devStorage` for local development
- **Adequate Scale** - Perfect for presentation use case

### Why Cloudflare Workers Only?

- **Durable Objects** depend on Cloudflare's infrastructure
- **Simplifies architecture** - No need to maintain two deployment paths
- **Free/cheap tier** - Suitable for the quiz use case
- **Global edge network** - Low latency for conference audiences worldwide

### Why Sharp Design (No Rounded Corners)?

- **Distinctive** - Sharp, professional appearance
- **Minimalist** - Focus on content
- **High Contrast** - Black and white clarity
- **Utility-First** - Tailwind CSS implementation

## Data Flow

### Quiz Participation

1. User enters nickname
1. Stored in localStorage
1. Views current question
1. Submits answer via REST API
1. API route calls DO to schedule batched results broadcast
1. DO alarm fires after 2 seconds and broadcasts results to WebSocket clients

### Admin Operations

1. Admin authenticates (JWT)
1. Creates question via REST API
1. Publishes question via REST API
1. API route calls DO to broadcast the new question to all WebSocket clients
1. Controls lock status (broadcasts lock state via DO)

### WebSocket Connection

1. Client connects to `/_ws?channel=default&userId=abc123`
1. Nitro route handler forwards the upgrade request to the `QuizSession` DO
1. DO accepts the WebSocket using the Hibernation API, tagging with channel and userId
1. DO broadcasts connection count update to all clients

## Security Model

### Authentication

- **JWT Tokens** - Stateless authentication via `jose` library (Web Crypto API, works in Workers and Node.js)
- **HTTP-only Cookies** - Token storage
- **Admin-only Routes** - Protected endpoints (async `verifyAdmin()`)

### Data Validation

- **Input Sanitization** - All user inputs validated
- **Type Checking** - TypeScript enforcement
- **Error Boundaries** - Graceful failure handling
