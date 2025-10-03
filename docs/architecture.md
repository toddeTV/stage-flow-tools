# Architecture Overview

System design and technical architecture of the quiz application.

## Tech Stack

### Frontend
- **Nuxt 3** - Vue meta-framework
- **Vue 3** - Composition API
- **Pure CSS** - Sharp, No Rounded Corners, design system

### Backend
- **Nitro** - Nuxt server engine
- **WebSockets** - Real-time communication
- **JWT** - Authentication tokens

### Storage
- **File-based JSON** - Zero-dependency persistence

## Application Structure

```
quiz/
├── app/           # Frontend application
│   ├── pages/     # Route components
│   └── app.vue    # Root component
├── server/        # Backend services
│   ├── api/       # REST endpoints
│   └── utils/     # Server utilities
└── data/          # JSON data storage
```

## Core Components

### Pages

- **`index.vue`** - Main quiz interface
- **`admin.vue`** - Admin dashboard
- **`results.vue`** - Results display

### API Routes

- **`/auth/*`** - Authentication endpoints
- **`/questions/*`** - Question management
- **`/answers/*`** - Answer submission
- **`/results/*`** - Results retrieval

## Design Decisions

### Why File-Based Storage?

- **Zero Dependencies** - No database setup required
- **Portability** - Works anywhere Node.js runs
- **Simplicity** - JSON files are human-readable
- **Adequate Scale** - Perfect for presentation use case

### Why WebSockets?

- **Real-time Updates** - Instant question changes
- **Low Latency** - Immediate feedback
- **Bidirectional** - Server can push updates
- **Built-in Support** - Native Nitro integration

### Why Sharp Design (No Rounded Corners)?

- **Distinctive** - Sharp, professional appearance
- **Minimalist** - Focus on content
- **High Contrast** - Black and white clarity
- **No Dependencies** - Pure CSS implementation

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

- **JWT Tokens** - Stateless authentication
- **HTTP-only Cookies** - Token storage
- **Admin-only Routes** - Protected endpoints

### Data Validation

- **Input Sanitization** - All user inputs validated
- **Type Checking** - TypeScript enforcement
- **Error Boundaries** - Graceful failure handling
