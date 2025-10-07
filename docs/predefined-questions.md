# Predefined Questions

This document explains how to automatically load a set of questions into the application when it starts up. This is useful for populating the quiz with initial data without manual entry.

## How It Works

1.  **Create the File**: In the `data/` directory, create a file named `predefined-questions.json`.

2.  **File Format**: The file must contain a JSON array of question objects. Each object must have a `question_text` (string) and `answer_options` (an array of objects, each with a `text` property).

    **Example `data/predefined-questions.json`:**
    ```json
    [
      {
        "question_text": "What is your favorite color?",
        "answer_options": [
          { "text": "Red" },
          { "text": "Green", "emoji": "💚" },
          { "text": "Blue" }
        ]
      },
      {
        "question_text": "Which technology do you prefer?",
        "answer_options": [
          { "text": "Frontend" },
          { "text": "Backend" }
        ]
      }
    ]
    ```

3.  **Processing**:
    - When the application starts, it checks for the existence of `data/predefined-questions.json`.
    - If found, it renames the file to `data/predefined-questions.json.processing` to prevent it from being processed again.
    - It reads the questions from the `.processing` file and adds any questions that do not already exist (based on `question_text`) to the main `data/questions.json` file.
    - After successful processing, the `.processing` file is deleted.
    - If an error occurs (e.g., malformed JSON), the `.processing` file is left in place for manual inspection.

This ensures that predefined questions are loaded exactly once in an atomic and safe manner.