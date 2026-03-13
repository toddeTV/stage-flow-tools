# WebSocket Implementation

Real-time communication system documentation.

## WebSocket Architecture

### Connection Management

- **Endpoint**: `ws://<host>/_ws`
- **Protocol**: Native WebSocket
- **Backend**: Cloudflare Durable Object (`QuizSession`) with WebSocket Hibernation API

All WebSocket connections are managed by a single `QuizSession` Durable Object instance (`idFromName('global')`). The Nitro route handler at `/_ws` forwards the upgrade request to the DO.

### Client Connection

```javascript
const ws = new WebSocket(
  "ws://localhost:3000/_ws?channel=default&userId=abc123",
);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle message
};
```

### Query Parameters

- **`channel`** - WebSocket channel: `default`, `results`, or `emojis`
- **`userId`** - Optional user identifier for tracking

WebSocket connections are tagged with `channel:<name>` and `user:<userId>` for efficient filtering during broadcasts.

## Event Types

### Server-to-Client Events

#### `new-question`

Broadcast when question published

```json
{
  "event": "new-question",
  "data": {
    /* question object */
  }
}
```

#### `lock-status`

Question lock state change

```json
{
  "event": "lock-status",
  "data": {
    "questionId": "string",
    "is_locked": "boolean"
  }
}
```

#### `results-update`

Bundled voting results (batched every 2 seconds)

```json
{
  "event": "results-update",
  "data": {
    /* results object */
  }
}
```

#### `connections-update`

Peer count change (on connect/disconnect)

```json
{
  "event": "connections-update",
  "data": {
    "totalConnections": "number"
  }
}
```

#### `emoji`

Emoji reaction broadcast

```json
{
  "event": "emoji",
  "data": {
    "emoji": "string",
    "id": "string (cuid2)"
  }
}
```

#### `winner-selected`

Sent to a specific user when they are picked as a random winner (via `/api/results/pick-random-user`). Only delivered to the winning user's WebSocket connection.

```json
{
  "event": "winner-selected",
  "data": {
    "userId": "string",
    "username": "string",
    "questionId": "string",
    "option": "string"
  }
}
```

#### `pong`

Server response to client `ping` keep-alive.

### Client-to-Server

#### `ping`

Keep-alive message

```json
"ping"
```

## Implementation Details

### Connection Lifecycle

1. **Upgrade** - Client sends WebSocket upgrade to `/_ws`
1. **Forward** - Nitro handler forwards upgrade to `QuizSession` Durable Object
1. **Accept** - DO accepts WebSocket via Hibernation API with channel/user tags
1. **Broadcast** - DO broadcasts connection count to all clients
1. **Message** - DO handles incoming messages (ping/pong)
1. **Close** - DO broadcasts updated connection count

### Durable Object Internal API

API routes communicate with the `QuizSession` DO via HTTP stub calls:

| Endpoint                  | Method | Purpose                                     |
| ------------------------- | ------ | ------------------------------------------- |
| `/connections`            | GET    | Get connection count and peer info          |
| `/broadcast`              | POST   | Broadcast event to all clients (by channel) |
| `/send-to-user`           | POST   | Send event to a specific user               |
| `/schedule-results`       | POST   | Schedule batched results update (alarm API) |
| `/check-emoji-cooldown`   | POST   | Check if user is on emoji cooldown          |
| `/update-emoji-timestamp` | POST   | Record emoji submission timestamp           |

### Proxy Functions (`server/utils/websocket.ts`)

API routes use proxy functions that abstract the DO stub calls:

- `getQuizSessionStub(event)` - Returns the DO stub from `event.context.cloudflare.env.QUIZ_SESSION`
- `broadcast(event, eventName, data, channel?)` - Broadcasts to all clients
- `sendToUser(event, userId, eventName, data, channel?)` - Sends to a specific user
- `getConnections(event)` - Returns `{ totalConnections, peers }`
- `scheduleResultsUpdate(event, data, channel)` - Schedules batched results broadcast
- `checkEmojiCooldown(event, userId, cooldownMs)` - Checks emoji cooldown
- `updateEmojiTimestamp(event, userId)` - Records emoji timestamp

All proxy functions take `H3Event` as the first parameter to access the Cloudflare environment.

### Reconnection Logic

```javascript
// Auto-reconnect after 3 seconds
ws.onclose = () => {
  setTimeout(() => {
    setupWebSocket();
  }, 3000);
};
```

### Keep-Alive

- **Interval**: 30 seconds
- **Message**: Simple "ping"
- **Purpose**: Prevent idle disconnect

## Broadcasting Strategy

### Immediate Events

- New question published
- Lock status changed

### Bundled Events

- Results updates (every 2 seconds)
- Reduces network traffic
- Smooths UI updates

## Error Handling

### Connection Errors

- Automatic reconnection
- Exponential backoff
- Maximum retry limit

### Message Errors

- JSON parse validation
- Unknown event handling
- Error logging

## Performance

### Durable Object Advantages

- **Persistent state** - WebSocket connections survive Worker isolate eviction. The DO stays alive as long as connections exist.
- **WebSocket Hibernation** - Idle connections do not consume CPU. The DO "wakes up" on incoming messages or alarm events.
- **Single instance** - All WebSocket connections are managed by one DO, eliminating cross-isolate coordination issues.
- **Alarm API** - Results batching uses the built-in alarm for 2-second delay, avoiding manual timers.

### Message Batching

- Group results updates
- 2-second buffer window via Durable Object alarm
- Single broadcast per batch

### Emoji Cooldowns

- Per-user cooldown tracked in DO transient memory
- No KV writes needed for cooldown tracking
- Expired cooldowns pruned automatically on each check
