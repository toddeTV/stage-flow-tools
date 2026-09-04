# WebSocket Implementation

Real-time communication system documentation.

## WebSocket Architecture

### Connection Management

- **Endpoint**: `ws://localhost:3000/_ws`
- **Protocol**: Native WebSocket
- **Framework**: Nitro experimental WebSocket

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

- **`channel`** - WebSocket channel: `default`, `results`, or `emojis`. The
  `results` channel requires the same admin session cookie as `/admin/results`
  and a matching browser origin.
- **`userId`** - Optional non-empty user identifier for tracking

The server validates the connection query with the shared Valibot schema before adding a peer. An invalid query closes the handshake with close code `1008` and reason `validation.invalid_websocket_query`.

## Event Types

### Server-to-Client Events

#### `new-question`

Broadcast when a question is published, the active question is edited or updated by
an import, or all questions are cleared. The payload uses the public question shape:
it excludes the admin note, key, lifecycle and queue fields, and answer-option emoji.
When all questions are cleared, `data` is `null`.

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

`results-update` may be sent immediately for explicit admin actions such as answer reset
or editing the active question.

#### `answers-reset`

Sent on the default channel when an admin clears answers, including a confirmed
answer-option change that resets a question's submitted answers.

Clients should clear the local stored answer for the matching `questionId`. They should
clear the visible selection only when that question is active.

```json
{
  "event": "answers-reset",
  "data": {
    "questionId": "string"
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

#### `emojis`

Emoji reaction batch

```json
{
  "event": "emojis",
  "data": [
    {
      "emoji": "string",
      "id": "string (cuid2)"
    }
  ]
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

This is the only accepted client-to-server message. Invalid messages are ignored and never broadcast or logged as application errors.

## Implementation Details

### Connection Lifecycle

1. **Open** - Client connects
2. **Message** - Bidirectional communication
3. **Error** - Handle failures
4. **Close** - Cleanup resources

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
- Answer reset

### Bundled Events

- Results updates (every 2 seconds)
- Reduces network traffic
- Smooths UI updates
- Emoji reactions (every `NUXT_EMOJI_BATCH_TICK_MS` milliseconds, up to
  `NUXT_EMOJI_BATCH_MAX_SIZE` reactions per batch)

## Error Handling

### Connection Errors

- Automatic reconnection
- Exponential backoff
- Maximum retry limit

### Message Errors

- Queries and messages are validated with the shared Valibot schemas.
- Invalid connection queries are rejected with policy-violation close code `1008`.
- Any client message other than the literal `ping` is ignored.

## Performance Optimization

### Message Batching

- Group results updates
- 2-second buffer window
- Single broadcast per batch

### Connection Pooling

- Maintain peer set
- Efficient broadcast
- Clean disconnection handling

### Runtime Notes

- Peer tracking stays in server memory.
- Restarting the Node.js process or Docker container drops active connections.
- Clients reconnect through the existing browser-side reconnect logic.
