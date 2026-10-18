# WebSocket Implementation

Real-time communication system documentation.

## WebSocket Architecture

### Connection Management

- **Endpoint**: `ws://localhost:3000/_ws/default` (use `wss://` over HTTPS)
- **Protocol**: Native WebSocket
- **Framework**: Nitro experimental WebSocket

### Client Connection

```javascript
const ws = new WebSocket(
  "ws://localhost:3000/_ws/default?channel=default&userId=abc123",
);
ws.onmessage = (event) => {
  if (event.data === "pong") return;
  const data = JSON.parse(event.data);
  // Handle message
};
```

The quiz and admin results clients load a current HTTP snapshot on every successful
connection, including the first connection and reconnections. Participants use
`/api/questions/active`; the results view uses `/api/results/current`, which requires
admin authentication. The server does not replay missed events on connection.

Initial loads, manual refreshes, and connection recovery share the same snapshot
handling. Newer requests and relevant live events supersede pending snapshots, so a
delayed response cannot replace newer state. A same-question refresh preserves the
participant's draft and confirmed answer. A snapshot reporting no active question
clears the corresponding display.

Snapshot requests retry network failures, HTTP 408, HTTP 429, and HTTP 5xx at most
twice: after one second, then after another two seconds. Other HTTP 4xx responses,
including 401 and 403, are not retried. After the last failure, the client retains
its last state; another connection or manual refresh can try again. Superseded
requests, disconnects, and component disposal abort pending snapshots and cancel
retry waits. This recovery does not synchronize answer resets missed while offline;
see [`answers-reset`](#answers-reset).

### Query Parameters

- **`channel`** - WebSocket channel: `default`, `results`, or `emojis`. The
  `results` channel requires the same admin session cookie as `/admin/results`
  and a matching browser origin.
- **`userId`** - Optional non-empty user identifier for tracking

The server validates the connection query with the shared Valibot schema before adding a peer. An invalid query closes the connection with close code `1008` and reason `validation.invalid_websocket_query`.

## Event Types

### Server-to-Client Events

Application events use JSON envelopes with `event` and `data`. Heartbeat replies
are raw text. All example data below is synthetic.

| Event | Delivery | Trigger |
| --- | --- | --- |
| `new-question` | All channels | Publish, edit the active question, or replace the active state with `null` |
| `lock-status` | All channels | Toggle or explicitly set a question's lock |
| `results-update` | `results` | Answer/retraction/lock changes after the buffer window, or an immediate admin state replacement |
| `answers-reset` | `default` | Reset active answers, confirm an answered option change, or reset the entire quiz |
| `emojis` | `emojis` | Flush queued reactions in a batch |
| `winner-selected` | Winning participant's matching `default` connections | Successful random-winner selection |
| `pong` | Connection that sent `ping` | Accepted raw-text heartbeat |

#### `new-question`

Broadcast when a question is published or the active question is edited. The payload
uses the public question shape: it excludes the admin note, key, author timestamp,
disabled/published flags, queue position, and answer-option emoji. It retains
`is_active` and `is_locked`.

Unpublishing or deleting the active question, deleting all questions, and resetting
the quiz send `data: null`. Deleting an inactive question does not replace the active
state. A successful question-package import only creates new questions and sends no
WebSocket events.

```json
{
  "event": "new-question",
  "data": {
    "id": "example-question",
    "question_text": {
      "en": "Choose an option."
    },
    "is_active": true,
    "is_locked": false,
    "createdAt": "2026-10-17T12:00:00.000Z",
    "answer_options": [
      {
        "text": {
          "en": "Option A"
        }
      },
      {
        "text": {
          "en": "Option B"
        }
      }
    ]
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
    "is_locked": true
  }
}
```

#### `results-update`

Voting results for the current question, with the full admin question shape. The
first answer, retraction, or lock change starts a two-second buffer window; further
changes within that window share one calculation and broadcast. This is not a
periodic broadcast when no changes occur.

```json
{
  "event": "results-update",
  "data": {
    "question": {
      "id": "example-question",
      "key": "round-1-question-1",
      "question_text": {
        "en": "Choose an option."
      },
      "answer_options": [
        {
          "text": {
            "en": "Option A"
          },
          "emoji": "⭐"
        },
        {
          "text": {
            "en": "Option B"
          }
        }
      ],
      "is_active": true,
      "is_disabled": false,
      "is_locked": false,
      "sortOrder": 0,
      "createdAt": "2026-10-17T12:00:00.000Z",
      "authoredAt": null,
      "alreadyPublished": true
    },
    "results": {
      "Option A": {
        "count": 10,
        "emoji": "⭐"
      },
      "Option B": {
        "count": 5
      }
    },
    "totalVotes": 15,
    "totalConnections": 42
  }
}
```

Publication, active-question edits, and resetting active answers cancel buffered
updates and send fresh results immediately. Unpublishing or deleting the active
question, deleting all questions, and resetting the quiz cancel buffered updates
and send `data: null`. An expected-key unpublish mismatch sends no events.

#### `answers-reset`

Sent on the default channel when an admin clears answers, including a confirmed
answer-option change that resets a question's submitted answers. A full quiz reset
sends this event for every retained question before broadcasting `new-question` with
`null` and `results-update` with `null` on their existing channels.

Clients should clear the local stored answer for the matching `questionId`. They should
clear the visible selection only when that question is active. This also clears cached
answers for inactive questions before the quiz restarts. Browsers disconnected during
the reset do not receive these events; offline cache synchronization is not provided.

```json
{
  "event": "answers-reset",
  "data": {
    "questionId": "string"
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

Sent when a participant is picked as a random winner via
`/api/results/pick-random-user`. Delivered only to `default` channel connections
registered with the winning participant's user ID.

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

Raw-text server response to the client heartbeat. It is not a JSON envelope or a
JSON-encoded string; handle it before parsing application events.

```text
pong
```

### Client-to-Server

#### `ping`

Send the literal text `ping`, for example with `ws.send("ping")`. Do not send
`JSON.stringify("ping")`, which adds quotation marks to the transmitted text.

```text
ping
```

This is the only accepted client-to-server message. Invalid messages are ignored and never broadcast or logged as application errors.

## Implementation Details

### Connection Lifecycle

1. **Open** - Client connects
2. **Message** - Bidirectional communication
3. **Error** - Handle failures
4. **Close** - Cleanup resources

### Reconnection Logic

The participant/results composable and emoji overlay use VueUse `useWebSocket`
with `autoReconnect: true`. The current dependency defaults retry unexpected
disconnects after one second, without a fixed attempt limit or exponential backoff.
An explicit client `close()` stops reconnection; `open()` starts a connection again.

### Keep-Alive

- **Participant/results interval**: 30 seconds through the shared quiz socket
- **Message**: Raw `ping`, answered with raw `pong`
- **Purpose**: Keep the connection active and detect missing heartbeat responses
- **Emoji overlay**: Automatic reconnect is enabled, but no heartbeat is configured

## Broadcasting Strategy

### Immediate Events

- New question published
- Lock status changed
- Answer reset
- Fresh results after publication, active-question edits, or active-answer reset
- Empty question/results state after unpublish, active deletion, delete-all, or quiz reset

### Bundled Events

- Result changes share a two-second buffer window before calculation and delivery
- Emoji reactions flush after `NUXT_EMOJI_BATCH_TICK_MS` milliseconds while queued,
  up to `NUXT_EMOJI_BATCH_MAX_SIZE` reactions per batch

## Error Handling

### Connection Errors

- Unexpected disconnects use the [automatic reconnect behavior](#reconnection-logic).
- Explicit client closure stops automatic reconnection.
- A rejected query closes with `1008` and `validation.invalid_websocket_query`.
- The protected results channel closes with `1008` and `auth.origin_invalid` for a
  missing or mismatched origin, or `auth.token_required` when authentication fails.

### Message Errors

- Queries and messages are validated with the shared Valibot schemas.
- Invalid connection queries are rejected with policy-violation close code `1008`.
- Any client message other than the literal `ping` is ignored.

## Performance Optimization

### Message Batching

- Answer, retraction, and lock changes request a results update.
- The server waits for one 2-second buffer window before calculating current results.
- Every window performs at most one calculation and one results-channel broadcast.
- Administrative state replacements cancel pending results before sending the new state immediately.

### Connection Pooling

- Maintain peer set
- Efficient broadcast
- Clean disconnection handling

### Runtime Notes

- Peer tracking stays in server memory.
- Restarting the Node.js process or Docker container drops active connections.
- Clients reconnect through the existing browser-side reconnect logic.
