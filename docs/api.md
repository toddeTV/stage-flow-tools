# API Reference

REST API endpoints documentation.

## Authentication

### POST `/api/auth/login`

Login as administrator.

This endpoint is for browser-style admin login with username and password. It sets the session cookie used by the admin UI.

**Request:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
Sets `admin_token` HTTP-only cookie and returns success.

### POST `/api/auth/logout`

Logout the administrator. Clears the `admin_token` cookie.

**Response:**

```json
{
  "success": true
}
```

### GET `/api/auth/verify`

Verify authentication token (admin only).

**Headers:**

- Cookie: `admin_token` (set automatically by login)
- Or `Authorization: Bearer <token>`

`Authorization: Bearer <token>` accepts two admin auth modes:

- A JWT created by `POST /api/auth/login`
- The exact static token configured in `NUXT_ADMIN_TOKEN` for software-to-software admin access

**Response:**

```json
{
  "valid": true,
  "user": {
    /* decoded JWT payload or static-token admin payload */
  }
}
```

**Static token example:**

```bash
curl \
  -H "Authorization: Bearer $NUXT_ADMIN_TOKEN" \
  http://localhost:3000/api/auth/verify
```

## Database Admin

### GET `/api/admin/drizzle-studio/app`

Load the authenticated Drizzle Studio shell used by `/admin/database`.

### GET `/api/admin/drizzle-studio/app/<asset>`

Load Drizzle Studio static assets through the authenticated proxy.

### GET `/api/admin/presenter/overview`

Get a high-level quiz overview for presenter software (admin only).

This endpoint is meant for low-frequency use, such as a one-time fetch from presenter slides when a session starts.

**Headers:**

- Cookie: `admin_token`
- Or `Authorization: Bearer <token>`

**Response:**

```json
{
  "totalQuestions": 3,
  "questions": [
    {
      "id": "string",
      "key": "string",
      "question_text": {
        "en": "string"
      }
    }
  ]
}
```

### GET `/api/admin/presenter/current-state`

Get detailed presenter state for the active question (admin only).

This endpoint is meant for polling, such as once per second from presenter slides.

`totalUsers` means active WebSocket connections at request time.

**Headers:**

- Cookie: `admin_token`
- Or `Authorization: Bearer <token>`

**Response:**

```json
{
  "hasActiveQuestion": true,
  "totalUsers": 42,
  "receivedAnswers": 15,
  "receivedAnswersPercent": 36,
  "currentQuestion": {
    "id": "string",
    "key": "string",
    "index": 2,
    "totalQuestions": 5,
    "question_text": {
      "en": "string"
    },
    "note": {
      "en": "string"
    },
    "is_active": true,
    "is_locked": false,
    "createdAt": "2026-05-03T12:00:00.000Z",
    "answer_options": [
      {
        "text": {
          "en": "string"
        },
        "emoji": "🔥",
        "count": 10,
        "percent": 67
      }
    ]
  }
}
```

**Response (no active question):**

```json
{
  "hasActiveQuestion": false,
  "totalUsers": 42,
  "receivedAnswers": 0,
  "receivedAnswersPercent": 0,
  "currentQuestion": null
}
```

### POST `/`

Internal admin-only Drizzle Studio RPC compatibility endpoint used by the embedded frame. Treat this as internal transport, not a public integration API.

## Questions

### GET `/api/questions`

Get all questions (admin only).

**Response:** Array of question objects.

### GET `/api/questions/active`

Get the currently active question (public). Returns a simplified version without emojis, admin notes, key, and `alreadyPublished`.

**Response (active question):**

```json
{
  "id": "string",
  "question_text": { "en": "string", "de": "string" },
  "answer_options": [{ "text": { "en": "string", "de": "string" } }],
  "is_active": true,
  "is_locked": false,
  "createdAt": "ISO 8601"
}
```

**Response (no active question):**

```json
{
  "message": "No active question"
}
```

### POST `/api/questions/create`

Create new question (admin only).

English `answer_options[].text.en` values must be unique. Matching is case-insensitive.

**Request:**

```json
{
  "key": "string (optional, unique identifier)",
  "question_text": { "en": "string", "de": "string (optional)" },
  "answer_options": [
    {
      "text": { "en": "string", "de": "string (optional)" },
      "emoji": "string (optional)"
    }
  ],
  "note": { "en": "string (optional)" }
}
```

### POST `/api/questions/update`

Update an existing unpublished and inactive question (admin only).

Editable fields are `key`, `question_text`, `answer_options`, and `note`.
Active questions and already-published questions return `409`.

English `answer_options[].text.en` values must be unique. Matching is case-insensitive.

**Request:**

```json
{
  "questionId": "string",
  "key": "string (optional, unique identifier)",
  "question_text": { "en": "string", "de": "string (optional)" },
  "answer_options": [
    {
      "text": { "en": "string", "de": "string (optional)" },
      "emoji": "string (optional)"
    }
  ],
  "note": { "en": "string (optional)" }
}
```

**Response:** Updated question object.

### POST `/api/questions/publish`

Publish question as active by key (admin only). Clears existing answers and broadcasts to all WebSocket clients.

**Request:**

```json
{
  "key": "string"
}
```

### POST `/api/questions/publish-next`

Publish the next unpublished question in creation order (admin only). Finds the earliest question where `alreadyPublished` is `false`, publishes it, and broadcasts to all WebSocket clients.

**Request:** No body required.

**Response:** The published question object, or 404 if no unpublished questions remain.

### POST `/api/questions/unpublish-active`

Deactivate the currently active question (admin only). Clears answers and broadcasts `null` as the new question.

**Request:** No body required.

**Response:**

```json
{
  "success": true,
  "message": "Active question unpublished."
}
```

### POST `/api/questions/toggle-lock`

Toggle answer lock on active question (admin only). Broadcasts lock status via WebSocket.

**Request:**

```json
{
  "questionId": "string"
}
```

## Answers

### POST `/api/answers/submit`

Submit or update a user answer.

**Request:**

```json
{
  "user_id": "string",
  "user_nickname": "string",
  "selected_answer": { "en": "string" }
}
```

**Response:**

```json
{
  "success": true
}
```

### POST `/api/answers/retract`

Retract a user's answer.

**Request:**

```json
{
  "user_id": "string",
  "question_id": "string"
}
```

**Response:**

```json
{
  "success": true
}
```

## Emojis

### POST `/api/emojis/submit`

Submit an emoji reaction. Broadcasts to all clients on the emojis WebSocket channel. Enforces per-user cooldown.

**Request:**

```json
{
  "emoji": "string (single emoji)",
  "user_id": "string"
}
```

## Results

### GET `/api/results/current`

Get current question results (admin only).

**Response:**

```json
{
  "question": {
    /* question object */
  },
  "results": {
    "Option A": { "count": 10, "emoji": "optional" },
    "Option B": { "count": 5 }
  },
  "totalVotes": 15,
  "totalConnections": 42
}
```

### POST `/api/results/pick-random-user`

Pick a random user who voted for a specific option (admin only). Sends a `winner-selected` WebSocket event to the chosen user.

**Request:**

```json
{
  "questionId": "string",
  "option": "string"
}
```

**Response:** `204 No Content` on success. Returns 404 if no answers or no users found for the option. Returns 503 if the winner is not currently connected.

### GET `/api/results/leaderboard`

Get aggregated player leaderboard across all published questions (admin only). A correct answer is any option with the `⭐` emoji.

**Response:**

```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "string",
      "nickname": "string",
      "correctAnswers": 5
    }
  ],
  "totalQuestionsWithCorrectAnswers": 10
}
```

## WebSocket Connections

### GET `/api/websockets/connections`

Get active WebSocket connections (admin only).

**Response:** Array of connection objects with `id` and `url`.

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "statusMessage": "Error description"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "statusMessage": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "statusMessage": "Question is locked"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "statusMessage": "No active question"
}
```

### 429 Too Many Requests

```json
{
  "statusCode": 429,
  "statusMessage": "You are sending emojis too fast. Please wait a moment."
}
```
