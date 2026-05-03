# Architecture Overview

System design and technical architecture of the quiz application.

## Tech Stack

### Frontend

- **Nuxt 4** - Vue meta-framework
- **Vue 3** - Composition API
- **Tailwind CSS** - Utility-first CSS framework

### Backend

- **Nitro** - Nuxt server engine
- **WebSockets** - Real-time communication
- **JWT** - Authentication tokens

### Storage

- **Nitro `useStorage()`** - Filesystem-backed storage at `.data/db/`

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
│   ├── routes/    # WebSocket handlers
│   └── utils/     # Server utilities
├── shared/        # Shared code (client + server)
│   └── utils/     # Shared utilities
├── .data/db/      # Local storage (dev/Docker, gitignored)
├── data/          # Predefined questions source (Node.js only)
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

### API Routes

- **`/auth/*`** - Authentication endpoints
- **`/questions/*`** - Question management
- **`/answers/*`** - Answer submission
- **`/results/*`** - Results retrieval
- **`/emojis/*`** - Emoji reactions
- **`/websockets/*`** - Connection monitoring

## Design Decisions

### Why Nitro useStorage()?

- **Low operational load** - No external database needed for the current single-instance model
- **Zero setup for local work** - Filesystem storage works out of the box
- **Docker-friendly** - Persistent mounts keep quiz data across restarts
- **Adequate scale** - Good fit for presentation and workshop use

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

1. Admin authenticates (JWT)
2. Creates question
3. Publishes question
4. WebSocket notifies all clients
5. Controls lock status

## Security Model

### Authentication

- **JWT Tokens** - Stateless authentication via `jose`
- **HTTP-only Cookies** - Token storage
- **Admin-only Routes** - Protected endpoints (async `verifyAdmin()`)

### Data Validation

- **Input Sanitization** - All user inputs validated
- **Type Checking** - TypeScript enforcement
- **Error Boundaries** - Graceful failure handling
