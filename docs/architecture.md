# Architecture Overview

System design and technical architecture of the quiz application.

## Tech Stack

### Frontend

- **Nuxt 4** - Vue meta-framework
- **Vue 3** - Composition API
- **Tailwind CSS** - Utility-first CSS framework
- **Nuxt Icon + Phosphor** - Locally bundled Iconify icons for accessible icon controls

### Backend

- **Nitro** - Nuxt server engine
- **WebSockets** - Real-time communication
- **JWT** - Authentication tokens

### Storage

- **Drizzle ORM + SQLite** - Persistent quiz and legal-document storage at `.data/db/stage-flow-tools.sqlite3`

## Application Structure

```text
stage-flow-tools/
├── app/           # Frontend application
│   ├── components/# Vue components (ui/, app/)
│   ├── composables/# Vue composables
│   ├── layouts/   # Nuxt layouts
│   ├── middleware/ # Route middleware
│   ├── pages/     # Route components
│   ├── utils/     # Client utilities
│   └── app.vue    # Root component
├── server/        # Backend services
│   ├── api/       # REST endpoints
│   ├── database/  # Drizzle schema, migrations, SQLite config
│   ├── routes/    # WebSocket handlers
│   └── utils/     # Server utilities
├── shared/        # Shared code (client + server)
│   └── utils/     # Shared utilities
├── .data/         # Local SQLite storage root (dev/Docker, gitignored)
└── docs/          # Project documentation
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
- **`legal-notice.vue`** - Public legal notice (Impressum)
- **`privacy-policy.vue`** - Public privacy policy (Datenschutzerklärung)

### API Routes

- **`/auth/*`** - Authentication endpoints
- **`/questions/*`** - Question management
- **`/answers/*`** - Answer submission
- **`/results/*`** - Results retrieval
- **`/emojis/*`** - Emoji reactions
- **`/legal/:key`** - Public legal-document reads
- **`/websockets/*`** - Connection monitoring

## Design Decisions

### Why Drizzle with SQLite?

- **Atomic writes** - SQLite removes the old JSON-blob write risks
- **Zero extra service** - No external database needed for the current single-instance model
- **Docker-friendly** - Persistent mounts keep quiz data across restarts
- **Future path** - Schema stays close to a later D1-compatible migration path

### Why WebSockets?

- **Real-time Updates** - Instant question changes
- **Low Latency** - Immediate feedback
- **Bidirectional** - Server can push updates
- **Built-in Support** - Native Nitro integration

### Why Sharp Design (No Rounded Corners)?

- **Distinctive** - Sharp, professional appearance
- **Minimalist** - Focus on content
- **High Contrast** - Black and white clarity
- **Utility-First** - Tailwind CSS implementation

## Data Flow

### Quiz Participation

1. User enters nickname
2. Stored in localStorage
3. Views current question
4. Submits answer via API
5. WebSocket broadcasts results

### Admin Operations

1. Admin authenticates (login cookie, bearer token, or tokenized admin page bootstrap)
2. Creates or edits questions
3. Publishes question
4. WebSocket notifies all clients
5. Controls lock status

### Legal Documents

1. Operator inserts deployment-specific Markdown into the `legal_documents`
   database rows.
2. Public legal pages fetch only `legal-notice` or `privacy-policy` through
   `/api/legal/:key`.
3. The client renders the returned Markdown after sanitizing it; raw HTML is
   not interpreted.

## Security Model

### Authentication

- **Browser Login** - `/login` with username/password issues `admin_token` HTTP-only cookie
- **Bearer Tokens** - Admin APIs accept `Authorization: Bearer <token>` via `verifyAdmin()`
- **Tokenized Admin Pages** - `/admin/...?...&token=<token>` bootstraps the normal admin cookie for embedded browser contexts
- **JWT Tokens** - Stateless authentication via `jose`
- **HTTP-only Cookies** - Token storage for browser sessions
- **Admin-only Routes** - Protected endpoints and pages use async verification middleware

### Data Validation

- **Valibot at both boundaries** - `shared/utils/validation.ts` owns reusable schemas and normalization. Browser forms use those schemas for inline feedback; every application-owned HTTP and WebSocket boundary validates again before side effects.
- **Localized content** - Question and answer option text may carry arbitrary locale keys. A non-empty English (`en`) value remains required so results and existing displays have a stable canonical label.
- **Codes, not server prose** - `shared/utils/api-errors.ts` defines the shared error-code contract. HTTP errors mirror the code in `statusMessage` and `data.code`; the client resolves `errors.<code>` from the global i18n catalog.
- **Safe error boundary** - `defineApiHandler()` logs unexpected server failures and returns `server.internal_error`, never implementation, database, credential, or upstream details.
