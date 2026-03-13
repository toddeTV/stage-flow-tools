# Predefined Questions

This document explains how to automatically load a set of questions into the application when it starts up. This is useful for populating the quiz with initial data without manual entry.

## How It Works (Local Dev Only)

During local development (`pnpm dev`), questions can be auto-loaded from a JSON file on disk:

1.  **Create the File**: In the `data/` directory, create a file named `predefined-questions.json`.

2.  **File Format**: The file must contain a JSON array of question objects. Each object must have a `question_text` (object with at least an `en` key) and `answer_options` (an array of objects, each with a `text` property as a localized object). An optional `key` field provides a stable unique identifier.

    **Example `data/predefined-questions.json`:**

    ```json
    [
      {
        "key": "fav-color",
        "question_text": {
          "en": "What is your favorite color?",
          "de": "Was ist deine Lieblingsfarbe?"
        },
        "answer_options": [
          { "text": { "en": "Red", "de": "Rot" } },
          { "text": { "en": "Green", "de": "Grün" }, "emoji": "💚" },
          { "text": { "en": "Blue", "de": "Blau" } }
        ]
      },
      {
        "question_text": { "en": "Which technology do you prefer?" },
        "answer_options": [
          { "text": { "en": "Frontend" } },
          { "text": { "en": "Backend" } }
        ]
      }
    ]
    ```

3.  **Processing**:
    - When the application starts, it checks for the existence of `data/predefined-questions.json`.
    - If found, it renames the file to `data/predefined-questions.json.processing` to prevent it from being processed again.
    - It reads the questions from the `.processing` file and adds any questions that do not already exist (matched by the English `question_text.en` value) to the main `data/questions.json` file.
    - Every question must have a non-empty `question_text.en` value. If any question in the batch is missing it or has an empty string, the **entire import is aborted** and the `.processing` file is left in place. Fix the offending entry in the `.processing` file and restart the application to retry.
    - After successful processing, the `.processing` file is deleted.
    - If an error occurs (e.g., malformed JSON), the `.processing` file is left in place for manual inspection.

This ensures that predefined questions are loaded exactly once in an atomic and safe manner.

> Filesystem-based auto-loading is only available during local development. For production (Cloudflare Workers), seed questions via KV as described below.

## Cloudflare Workers (KV Seeding)

On Cloudflare Workers the filesystem is not available. Predefined questions must be seeded directly into KV using the Wrangler CLI.

### Seeding Questions into KV

Prepare your questions as a JSON array matching the `Question[]` schema and write them to KV:

```bash
npx wrangler kv key put --binding=STAGE_FLOW_DATA "questions" --path=./my-questions.json
```

Or inline for a small set:

```bash
npx wrangler kv key put --binding=STAGE_FLOW_DATA "questions" '[{"id":"q1","key":"demo","question_text":{"en":"Demo?"},"answer_options":[{"text":{"en":"Yes"}},{"text":{"en":"No"}}],"is_locked":true,"createdAt":"2025-01-01T00:00:00.000Z","alreadyPublished":false}]'
```

Each question object must include all required fields (`id`, `question_text`, `answer_options`, `is_locked`, `createdAt`, `alreadyPublished`). The `key` field is optional. See the schema in [storage.md](storage.md).

> **Manual deploys** (`npx wrangler deploy`): KV data persists across deployments - you only need to seed once unless you want to replace the data.<br>
> **CI/CD deploys** (`deploy-cloudflare.yml`): The workflow resets `questions` and `answers` to `[]` after every deploy. Re-seed questions after each automated deployment. Admin credentials are preserved.

### Push Script (Recommended for Conference Speakers)

For a workflow where questions live alongside presentation slides in a separate repo, use the push script. It resets all quiz data and uploads fresh questions in a single command:

```bash
pnpm run deploy:push-to-cloudflare -- --questions ./my-questions.json
```

The script clears answers, replaces questions, and optionally overrides admin credentials. See [deployment-cloudflare.md](deployment-cloudflare.md#pushing-questions-from-local-to-cloudflare) for the full reference.
