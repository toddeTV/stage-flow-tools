# WebSocket Implementation

Real-time communication system documentation.

## WebSocket Architecture

### Connection Management

- **Endpoint**: `ws://localhost:3000/_ws`
- **Protocol**: Native WebSocket
- **Framework**: Nitro experimental WebSocket

### Client Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/_ws?channel=default&userId=abc123')
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Handle message
}
```

### Query Parameters

- **`channel`** - WebSocket channel: `default`, `results`, or `emojis`
- **`userId`** - Optional user identifier for tracking

## Event Types

### Server-to-Client Events

#### `new-question`
Broadcast when question published
```json
{
  "event": "new-question",
  "data": { /* question object */ }
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
  "data": { /* results object */ }
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

### Client-to-Server

#### `ping`
Keep-alive message
```json
"ping"
```

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
    setupWebSocket()
  }, 3000)
}
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

## Performance Optimization

### Message Batching

- Group results updates
- 2-second buffer window
- Single broadcast per batch

### Connection Pooling

- Maintain peer set
- Efficient broadcast
- Clean disconnection handling
