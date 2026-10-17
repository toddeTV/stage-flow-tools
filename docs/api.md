# API Reference

REST API endpoints documentation. [Common errors](#validation-and-error-responses)
apply where the endpoint validates input or requires admin authentication. Additional
endpoint-specific errors are listed below; successful empty states remain successful.

## Authentication

Stage Flow Tools supports three admin authentication variants:

1. Browser login with username and password, which creates the `admin_token` HTTP-only cookie.
2. `Authorization: Bearer <token>` on admin APIs.
3. `?token=<token>` on protected `/admin` pages, which verifies the token and then establishes the normal admin cookie for the browser session.

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

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 401 | `auth.credentials_invalid` | Username or password does not match. Ask the operator to correct the credentials. |

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

**Accepted auth inputs:**

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
    "authMethod": "static-token",
    "isAdmin": true,
    "username": "admin-token"
  }
}
```

The verification response above shows static-token authentication. Browser-login JWT
payloads contain `username`, `isAdmin`, and `exp` instead of `authMethod`.

**Static token example:**

```bash
curl \
  -H "Authorization: Bearer $NUXT_ADMIN_TOKEN" \
  http://localhost:3000/api/auth/verify
```

**Tokenized admin page example:**

```text
http://localhost:3000/admin/results?token=<token>&core&visibility=show
```

Use `?token=` only when software needs to open a protected admin page in a browser or iframe. The route middleware forwards that token to `/api/auth/verify`, and successful verification sets the normal `admin_token` cookie for subsequent requests.

Query tokens in URLs can leak through browser history, server logs, and referrer headers. Use this flow only for initial bootstrap, then remove the token from the URL immediately after `/api/auth/verify` establishes the normal `admin_token` cookie.

## Database Admin

### GET `/api/admin/drizzle-studio/app`

Load the authenticated Drizzle Studio shell used by `/admin/database`.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 502 | `studio.shell_unavailable` | Upstream shell fetch failed. Check upstream reachability before reloading Studio. |
| 502 | `studio.shell_load_failed` | Upstream returned an unsuccessful shell response. Check upstream availability. |
| 504 | `studio.shell_timeout` | Shell fetch reported an abort. Check connectivity before reloading Studio. |

### GET `/api/admin/drizzle-studio/app/<asset>`

Load Drizzle Studio static assets through the authenticated proxy. Asset paths must be non-empty relative paths and cannot contain `.` or `..` segments.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 400 | `studio.asset_path_invalid` | Asset path violates the allowed relative-path rules. Correct the path. |
| 404 | `studio.asset_not_found` | No asset path was provided. Request an asset through the Studio shell. |
| 502 | `studio.asset_unavailable` | Upstream asset fetch failed. Check upstream reachability. |
| 504 | `studio.asset_timeout` | Asset fetch reported an abort. Check connectivity before reloading Studio. |
| Upstream error status | `studio.asset_load_failed` | Upstream rejected the asset request; its status is preserved. Check the requested asset and upstream availability. |

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

Get detailed presenter state for the active question (admin only). Optional `key=<stable-key>` selects an enabled question including its retained inactive aggregates. Unknown or disabled keys return `quiz.question_not_found`. The response keeps the same shape: `currentQuestion` contains the selection, and `hasActiveQuestion` indicates whether that question is active. `currentQuestion.alreadyPublished` records whether it has been published before.

This endpoint is meant for polling, such as once per second from presenter slides.

`totalUsers` means active participant connections on the default WebSocket channel at request time. Results and emoji display connections are excluded.

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

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.question_not_found` | The supplied key is unknown or disabled. Refresh the question list and choose an enabled key. |

### POST `/`

Internal admin-only Drizzle Studio RPC compatibility endpoint used by the embedded frame. Treat this as internal transport, not a public integration API. Its opaque Drizzle RPC payload is intentionally passed through without application-level schema validation.

After startup succeeds, upstream RPC status and body are forwarded unchanged.
Those responses need not use the application error envelope; check database state
before repeating a write whose outcome is uncertain.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 500 | `studio.invalid_internal_port` | Configured Studio port is invalid. Correct the server configuration. |
| 502 | `studio.start_failed` | The internal Studio worker did not become ready. Check worker startup and the private port. |
| 502 | `studio.proxy_unavailable` | The internal RPC fetch failed. Check the worker before repeating the request. |
| 504 | `studio.proxy_timeout` | The RPC fetch reported an abort. Check the worker and inspect database state before repeating a write. |

## Legal Documents

### GET `/api/legal/:key`

Get one public, deployment-specific legal document. Authentication is not
required. `key` must be `legal-notice` or `privacy-policy`.

**Response:**

```json
{
  "key": "legal-notice",
  "content": "Markdown body",
  "updatedAt": "2026-09-03T12:00:00.000Z"
}
```

Unknown keys and documents that have not been configured return a successful empty
response, not a `404` error.
The application has no public or admin API for writing legal documents; an
operator maintains the corresponding database rows directly. See
[Deployment-Specific Legal Documents](legal-texts.md).

## Questions

### GET `/api/questions`

Get all questions (admin only).

**Response:** Array of question objects. Admin question records include nullable
`authoredAt`, the author-supplied question creation timestamp in UTC. It is independent
of `createdAt`, which records database creation. Public question responses omit
`authoredAt`.

### GET `/api/questions/locales`

Get the combined language keys from all stored questions (public), including disabled questions. Collects populated question text, answer option, and note translations. Keys are trimmed, lowercased, deduplicated, and sorted; regional keys remain separate. Returns no question content or internal fields.

**Response:** Array of language keys, for example `["de", "en", "es", "xx"]`. An empty database returns `[]`.

Clients load the pool once per full page load; see [Languages](features/languages.md).

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

Create new question (admin only). Localized question and answer text may use any locale key; their non-empty English (`en`) value is required.

English `answer_options[].text.en` values must be unique. Matching is case-insensitive.

Question and answer strings support a restricted Markdown subset: `**bold**`,
`*italic*`, inline code with backticks, and fenced code blocks. Raw HTML and
other Markdown features are displayed as text. Presenter mode collapses fenced
code into inline code; participant, live-results, and recap views keep code
blocks scrollable.

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

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 409 | `quiz.question_key_conflict` | The key already exists. Choose another key or edit the existing question. |

### POST `/api/questions/import`

Import a current-format question package (admin only). Only the exact numeric
`version: 2` is supported. Missing versions, other types, and earlier or future
versions are rejected; there are no compatibility ranges or automatic conversions.
The full package is validated
before one SQLite transaction adds new questions. If a non-empty `key` already
exists, the entire transaction fails with `409 quiz.question_key_conflict`, including
keys added after the client preview. No questions or answers change and no events
are broadcast. Questions without a key receive a generated key.

```json
{
  "format": "stage-flow-tools.question-package",
  "version": 2,
  "commitSha": "0123456789abcdef0123456789abcdef01234567",
  "questions": [
    {
      "key": "round-1-question-1",
      "authoredAt": "2026-10-16T12:00:00Z",
      "question_text": {
        "en": "**What does this return?**\n\n```ts\nconst value = 1\nreturn value\n```"
      },
      "answer_options": [
        { "text": { "en": "*One* with `number`" } },
        { "text": { "en": "`undefined`" } }
      ],
      "note": { "en": "Optional" },
      "is_disabled": false
    }
  ]
}
```

JSON strings encode code-block line breaks as `\n`. Exported Version 2
packages preserve Markdown source and internal line breaks unchanged.

Each question may include an optional `authoredAt` field directly on the question
object. The `meta` field is not supported and is rejected, even when empty.
If supplied, `authoredAt` must be a valid ISO 8601 UTC timestamp ending in `Z`, with
seconds and optionally one to three fractional second digits. The server normalizes
it to millisecond precision. Invalid dates, empty strings, `null`, date-only values,
and timezone offsets are rejected before persistence. Missing values are stored as
`NULL`, not inferred from the import time or database `createdAt`. Exports include
`authoredAt` only when known. Version 1 files are rejected, including files
without metadata. Destination installations must support Version 2; there is no
automatic conversion.

Convert local times to UTC before creating the package; see the
[Berlin summer and winter examples](features/questions.md#question-packages).

`commitSha` is optional metadata identifying the intended software commit. When
present it must contain 40 hexadecimal characters; surrounding whitespace is
trimmed and letters are normalized to lowercase. Missing metadata allows normal
imports when the installed commit is known. It is not stored on question records.

After validation, the server compares the package SHA with its embedded build
SHA. A mismatch requires `?confirmedCommitSha=<installed SHA>` after explicit
operator confirmation. If installed metadata is unavailable, every import
requires `?confirmedCommitSha=unknown`. Without matching confirmation the API
returns `409 quiz.question_package_commit_confirmation_required` before any
database writes or broadcasts. Confirmation cannot bypass an invalid version.
If the installed commit changes between preview and import, refresh the preview
and obtain new confirmation; do not silently retry.

**Response:**

```json
{
  "createdCount": 1,
  "updatedCount": 0
}
```

Successful imports always return `updatedCount: 0`; imports never update existing questions.
Package validation failures use HTTP `400` with `validation.invalid_request`; inspect
`data.issues` for details such as `validation.unsupported_question_package_version`,
`validation.duplicate_question_key`, or `validation.invalid_question_package`.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 409 | `quiz.question_key_conflict` | A package key already exists. Resolve the conflicting keys before importing again. |
| 409 | `quiz.question_package_commit_confirmation_required` | Installed build metadata is unknown or differs from the package. Refresh the preview and obtain explicit confirmation for the installed build. |

### GET `/api/admin/build-info`

Returns the immutable build commit SHA (admin only), normalized to lowercase.
Missing or corrupt runtime metadata returns `commitSha: null` successfully. The import preview and
export read this endpoint from the currently installed server, rather than
relying on browser bundle metadata.

```json
{
  "commitSha": "0123456789abcdef0123456789abcdef01234567"
}
```

### POST `/api/questions/update`

Update an existing question (admin only). Localized question and answer text may use any locale key; their non-empty English (`en`) value is required. Updating the active question broadcasts the updated question and a freshly calculated results update to connected participants.

Editable fields are `key`, `question_text`, `answer_options`, and `note`.
English `answer_options[].text.en` values must be unique. Matching is case-insensitive.
When submitted answers exist, changing `answer_options` requires `resetAnswers: true`.
The API otherwise returns `409 quiz.question_answers_reset_required`; confirmed updates
delete the answers and update the question in one transaction.

**Request:**

```json
{
  "questionId": "string",
  "resetAnswers": "boolean (required as true when changing answered options)",
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

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.question_not_found` | The question ID does not exist. Refresh the question list. |
| 409 | `quiz.question_key_conflict` | Another question already uses the key. Choose a unique key. |
| 409 | `quiz.question_answers_reset_required` | Answered options would change. Obtain confirmation before resubmitting with `resetAnswers: true`. |

### POST `/api/questions/publish`

Publish question as active by key (admin only). Preserves submitted answers and lock state, and broadcasts to all WebSocket clients.

**Request:**

```json
{
  "key": "string"
}
```

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.question_not_found` | No question matches the key. Refresh the question list before selecting a key. |

### POST `/api/questions/publish-next`

Publish the next enabled question after the active question in queue order (admin only). Previously published questions can be published again. Without an active question, it selects the first enabled question. It does not wrap after the last enabled question and broadcasts the selected question to all WebSocket clients.

**Request:** No body required.

**Response:** The published question object, or 404 with `quiz.no_enabled_question` if no enabled question can be selected.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.no_enabled_question` | No next enabled question is available. Review queue position and disabled questions. |
| 500 | `quiz.publish_next_failed` | The selected question could not be published. Refresh state and investigate before trying again. |

### POST `/api/questions/move`

Move a question one position in the persistent queue (admin only). Published and disabled questions remain visible and can also be reordered. Moving beyond either queue boundary succeeds without changing the order.

**Request:**

```json
{
  "questionId": "string",
  "direction": "up | down"
}
```

**Response:** Updated question object.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.question_not_found` | The question ID does not exist. Refresh the queue. |

### POST `/api/questions/toggle-disabled`

Toggle whether a question is skipped by `publish-next` (admin only). Direct publishing remains available for disabled questions.

**Request:**

```json
{
  "questionId": "string"
}
```

**Response:** Updated question object.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.question_not_found` | The question ID does not exist. Refresh the question list. |

### POST `/api/questions/delete`

Permanently delete a question and every submitted answer for it (admin only). Deleting the active question broadcasts an empty active-question and results state.

**Request:**

```json
{
  "questionId": "string"
}
```

**Response:**

```json
{
  "questionId": "string",
  "success": true
}
```

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.question_not_found` | The question ID does not exist. Refresh the list; do not assume the question still needs deletion. |

### POST `/api/questions/delete-all`

Permanently delete every question and submitted answer (admin only). The route
uses one transaction, clears pending result updates, and broadcasts an empty
question and results state. An empty database succeeds with `deletedQuestionCount: 0`.

**Request:** No body required.

**Response:**

```json
{
  "deletedQuestionCount": 3,
  "success": true
}
```

### POST `/api/questions/reset`

Reset the entire quiz (admin only). The questions page requires confirmation before
calling this endpoint. One transaction permanently deletes all submitted answers and
sets `alreadyPublished`, `is_active`, `is_locked`, and `is_disabled` to `false` for every
question. Questions, IDs, content, and persisted queue order are preserved.

**Request:** No body required, or `{}`. Other fields are rejected.

**Response:**

```json
{
  "resetQuestionCount": 3,
  "success": true
}
```

An empty or already-reset quiz succeeds. After storage completes, the endpoint cancels
pending result updates, sends [`answers-reset`](websocket.md#answers-reset) for every
question on the default channel, and broadcasts empty question and results state.
The next automatic publication starts at the first question in the existing queue.

### POST `/api/questions/unpublish-active`

Deactivate the currently active question (admin only). Preserves answers and broadcasts `null` as the new question only when a question is deactivated.

**Request:** No body required, or an optional `{ "expectedKey": "package-key" }`.
With `expectedKey`, the atomic update deactivates only the matching active question.
A mismatch is a successful no-op and broadcasts nothing.

**Response:**

```json
{
  "success": true,
  "message": "Active question unpublished."
}
```

### POST `/api/questions/toggle-lock`

Toggle a question's answer lock (admin only), or set it deterministically with
optional `locked: boolean`. Broadcasts lock status via WebSocket.

**Request:**

```json
{
  "questionId": "string"
}
```

Omitting `locked` toggles the current state. Supplying `true` or `false` sets that
state even when it already matches.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.question_not_found` | The question ID does not exist. Refresh the question list before changing voting state. |

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

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 400 | `quiz.invalid_answer` | The English answer does not match an active option. Refresh the active question and submit one of its options. |
| 403 | `quiz.question_locked` | Voting is locked. Wait for the admin to reopen voting. |
| 404 | `quiz.no_active_question` | No question is active. Wait for a publication and refresh the active question. |

### POST `/api/answers/retract`

Retract a user's answer. If no answer matches the participant/question pair, the
request still succeeds; it does not return a not-found error.

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

### POST `/api/answers/reset`

Clear all submitted answers for current active question (admin only).

This endpoint derives target question from current active question. Request body is empty.

**Response:**

```json
{
  "success": true,
  "questionId": "string"
}
```

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `quiz.no_active_question` | There is no active question to reset. Refresh state and select the intended question first. |

## Emojis

### POST `/api/emojis/submit`

Submit an emoji reaction. The server queues reactions for batched delivery to clients on the emojis WebSocket channel and enforces a per-user cooldown. When the configured in-memory queue is full, new reactions are discarded while this endpoint still returns success.

**Request:**

```json
{
  "emoji": "string (single emoji)",
  "user_id": "string"
}
```

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 429 | `emoji.cooldown` | The participant is still within the reaction cooldown. Wait for the configured cooldown before submitting again. |

## Results

### GET `/api/results/current`

Get current question results (admin only).

`totalConnections` counts only participant connections on the default WebSocket channel.
With no active question, the endpoint returns HTTP `200` and
`{ "message": "No active question" }` instead of a results object.

**Response:**

```json
{
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

**Response:** `204 No Content` on success. See the error codes below when no winner
notification can be delivered.

**Additional errors:**

| HTTP status | `data.code` | Condition and client action |
| --- | --- | --- |
| 404 | `answer.no_answers_for_question` | The question has no stored answers. Wait for answers or select another question. |
| 404 | `answer.no_users_for_option` | No stored answer matches the selected English option label. Refresh results and select an answered option. |
| 503 | `websocket.winner_not_connected` | The randomly selected participant has no matching connected default-channel peer. No notification was delivered; choose whether to draw again. |

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
  "totalPublishedQuestions": 12,
  "totalQuestionsWithCorrectAnswers": 10
}
```

### GET `/api/results/recap`

Get post-quiz totals and question highlights across all published questions (admin only). Correct answers use the
same `⭐` convention as the leaderboard. The response contains no participant identifiers or nicknames.

**Response:**

```json
{
  "totals": {
    "publishedQuestions": 12,
    "answeredQuestions": 10,
    "participants": 42,
    "answers": 380,
    "scoredAnswers": 350,
    "correctAnswers": 287
  },
  "highlights": [
    {
      "kind": "best-known",
      "question": {
        "id": "question-id",
        "text": { "en": "Which answer is correct?" }
      },
      "answerCount": 40,
      "correctAnswerCount": 36
    },
    {
      "kind": "closest-call",
      "question": {
        "id": "another-question-id",
        "text": { "en": "Choose one." }
      },
      "answerCount": 39,
      "leadingOptions": [
        { "text": { "en": "First" }, "count": 20 },
        { "text": { "en": "Second" }, "count": 19 }
      ]
    }
  ]
}
```

Highlights use the fixed order `best-known`, `hardest`, `most-answered`, and `closest-call`. A highlight is omitted
when the stored answers cannot support it.

## WebSocket Connections

### GET `/api/websockets/connections`

Get active WebSocket connections (admin only).

**Response:** Array of connection objects with `id` and `url`.

## Validation and error responses

All application-owned HTTP endpoints validate input with the shared Valibot schemas in `shared/utils/validation.ts`. Client validation helps people correct forms early, but each server boundary validates again.

Errors use stable machine-readable codes. This is a breaking change from prose `statusMessage` values: `statusMessage` now exactly mirrors `data.code`, and clients localize `errors.<code>` themselves.

```json
{
  "statusCode": 400,
  "statusMessage": "validation.invalid_request",
  "data": {
    "code": "validation.invalid_request",
    "issues": [
      {
        "code": "validation.required",
        "path": ["question_text"]
      }
    ]
  }
}
```

`issues` is present only for schema failures. Each issue contains a stable code and a field path; array indexes are serialized as strings. Unexpected failures are logged server-side and return only `server.internal_error`.

The supported code namespaces are `validation.*`, `auth.*`, `quiz.*`, `emoji.cooldown`, `answer.*`, `websocket.*`, `studio.*`, `route.not_found`, and `server.internal_error`. HTTP status codes retain their existing meanings.

Common errors below are added to the endpoint-specific errors. Admin authentication
is checked before request validation on protected endpoints. Login and logout do not
require an existing admin session; logout still succeeds when no session exists.

| HTTP status | `data.code` | Applies when / client action |
| --- | --- | --- |
| 400 | `validation.invalid_request` | A validated body or query is invalid, or the body cannot be read. Correct the input using `data.issues` when present. |
| 401 | `auth.token_required` | An admin-only endpoint receives no token. Sign in or supply a valid bearer token. |
| 401 | `auth.token_invalid` | Admin verification rejects the token, including an expired JWT. Sign in again or correct the bearer token. |
| 403 | `auth.origin_invalid` | An admin mutation authenticates through a cookie without a matching Stage Flow `Origin`. Use the Stage Flow page or the documented bearer-header integration; CORS does not relax this check. |
| 500 | `server.internal_error` | An unexpected handler failure occurred. Retain the current UI state and investigate; refresh server state before repeating a mutation. |

Validation issue codes are field-level details, not necessarily the top-level
`data.code`. For example, a malformed question package returns
`validation.invalid_request` with package-specific codes under `data.issues`.
The Studio asset proxy uses `studio.asset_path_invalid` as its top-level validation
code instead. The Presenter embed-config endpoint also returns
`400 validation.invalid_request` if its configured parent origins fail validation;
the operator must correct the configuration rather than change the browser request.

An empty active-question response, missing build metadata, an empty quiz reset,
and an expected-key unpublish mismatch are successful states. Do not convert them
into generic not-found errors or silently retry confirmation-required actions.

## Parent-managed Presenter

`GET /api/admin/presenter/embed-config` returns `{ "allowedOrigins": [] }` after admin authentication. `NUXT_PRESENTER_PARENT_ORIGINS` contains exact slideshow origins; empty disables parent control. This permission is independent of REST API CORS.

`POST /api/questions/toggle-lock` accepts optional `locked: boolean` with `questionId` to set an explicit state. Omitting it preserves toggle behavior.

`POST /api/questions/unpublish-active` accepts optional `{ "expectedKey": "package-key" }`. An atomic conditional update closes only the matching active question. A mismatch is a successful no-op and emits no broadcast; empty requests retain existing behavior. Answers remain saved.

The [Presenter guide](features/presenter.md#parent-managed-slideshow-integration) owns selection, parent messages, and lifecycle. The former `/api/admin/presenter/question-state` endpoint and split embed modes are removed; use `/api/admin/presenter/current-state?key=<stable-key>` and the existing Presenter view.
