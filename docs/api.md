# API Reference

REST API endpoints documentation.

## Authentication

### POST `/api/auth/login`

Login as administrator.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "JWT string"
}
```

### GET `/api/auth/verify`

Verify authentication token.

**Headers:**
- `Authorization: Bearer <token>`
- Or cookie: `admin-token`

**Response:**
```json
{
  "valid": true,
  "user": { /* user data */ }
}
```

## Questions

### GET `/api/questions`

Get active question.

**Response:**
```json
{
  "id": "string",
  "question_text": "string",
  "answer_options": ["string"],
  "is_active": true,
  "is_locked": false
}
```

### POST `/api/questions/create`

Create new question (admin only).

**Request:**
```json
{
  "question_text": "string",
  "answer_options": ["string", "string"]
}
```

### POST `/api/questions/publish`

Publish question as active (admin only).

**Request:**
```json
{
  "questionId": "string"
}
```

### POST `/api/questions/toggle-lock`

Toggle answer lock (admin only).

**Request:**
```json
{
  "questionId": "string"
}
```

## Answers

### POST `/api/answers/submit`

Submit user answer.

**Request:**
```json
{
  "user_nickname": "string",
  "selected_answer": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

## Results

### GET `/api/results/current`

Get current question results.

**Response:**
```json
{
  "question": { /* question object */ },
  "results": {
    "Option A": 10,
    "Option B": 5
  },
  "totalVotes": 15
}
```

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
