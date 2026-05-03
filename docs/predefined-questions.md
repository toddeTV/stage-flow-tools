# Predefined Questions

This document explains how to automatically load a set of questions into the application when it starts up. This is useful for populating the quiz with initial data without manual entry.

## How It Works

1.  **Create the File**: In the `data/` directory, create a file named `predefined-questions.json`.

2.  **File Format**: The file must contain a JSON array of question objects. Each object must have a `question_text` (object with at least an `en` key) and `answer_options` (an array of objects, each with a `text` property as a localized object). An optional `key` field provides a stable identifier.

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
    - It reads the questions from the `.processing` file and adds any questions that do not already exist, matched by the English `question_text.en` value, to the runtime storage under `.data/db/`.
    - Every question must have a non-empty `question_text.en` value. If any question in the batch is missing it or has an empty string, the **entire import is aborted** and the `.processing` file is left in place. Fix the offending entry in the `.processing` file and restart the application to retry.
    - After successful processing, the `.processing` file is deleted.
    - If an error occurs (e.g., malformed JSON), the `.processing` file is left in place for manual inspection.

This ensures that predefined questions are loaded exactly once in an atomic and safe manner.

## Operational Notes

- This import path is filesystem-based and works in local development, Docker, and direct Node.js runtime use.
- Persist `.data/db/` in Docker or direct Node.js deployments so imported quiz data survives restarts.
- For repeatable conference setups, keep your curated question set in version control and drop a fresh `data/predefined-questions.json` file before starting the app.
