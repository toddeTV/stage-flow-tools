# Questions

## Overview

Admins prepare localized questions, manage the live queue, and move reusable question packages between installations.

## Access and prerequisites

Use `/admin/questions` with [admin access](admin-access.md). Question and answer text requires a non-empty English value; additional locale keys are supported. Each question needs at least two options with distinct English labels, compared case-insensitively.

## Capabilities and controls

- Create or edit question text, answer options, optional emoji, a stable key, and an optional localized note.
- Publish a selected question, publish the next enabled queue item, or unpublish the active question.
- Move questions up or down and enable or disable them for automatic publication.
- Lock or unlock voting and reset the active question's answers after confirmation.
- Reset the entire quiz after confirmation, preserving all questions and their queue order.
- Delete an individual question or clear all questions after confirmation.
- Export questions to JSON or preview and confirm a package import.
- View the optional author-supplied creation timestamp as **Authored on (UTC)**; unknown dates show `–`.

### Reset Quiz

Choose **Reset Quiz** in the question-list actions, then confirm the dialog. This
permanently deletes all submitted answers and resets every question to not asked,
inactive, unlocked, and enabled. Questions and their current order remain intact;
**Publish Next** starts again at the first question. Canceling leaves the quiz unchanged.

During the request, reset controls and competing page actions are disabled. Escape
and backdrop clicks cannot close the pending dialog. A failed request keeps the dialog
open with an error. Once the reset succeeds, the dialog closes before questions are
reloaded. If that refresh fails, a separate message confirms the completed reset and
offers a refresh-only retry. Another reset requires a new confirmation.
Participant nicknames and browser identities remain unchanged.
Connected participant browsers clear cached answers for every question; browsers
disconnected during the reset do not receive this cache cleanup.

See the [reset API](../api.md#post-apiquestionsreset) and
[answer-reset events](../websocket.md#answers-reset) for the technical contracts.

### Question packages

Export downloads a current-format JSON package from the current server question list. It contains the format marker, numeric format version (`1`), the installed software's full `commitSha`, ordered questions, stable keys, localized text, options, notes, `is_disabled`, and known author timestamps in `meta.authoredAt`. It excludes answers, generated technical IDs, and lifecycle state. Empty lists and installations with unavailable commit metadata cannot be exported.

To import, open the question-creation dialog, choose package import, and select a JSON file. The wizard validates the file, refreshes the existing question list and installed commit metadata, and shows how many rows will be created and lists conflicting keys. Existing keys block confirmation. Confirmation remains disabled until this preview is ready. Selecting another file invalidates the previous preview.

Only the exact current numeric format version is accepted. `version` identifies the questions format, independently of the software version; older and future formats are rejected without conversion. Manually created files may omit `commitSha`. If present, it must contain the full 40-character hexadecimal commit SHA.

A different commit SHA opens a confirmation warning showing both commits. It explains that the matching format ensures the questions work correctly, while other software features may differ from the file's creation time. Canceling sends no import. Missing installed commit metadata also requires explicit confirmation because comparison is impossible. The server enforces the same checks; a deployment change refreshes the preview and requires new confirmation without automatically retrying the import.

New or missing keys append questions to the queue. If a non-empty key already exists, the entire import fails without changes. The server checks again inside the transaction, including when another admin adds a key after the preview. Duplicate non-empty keys within the package and unsupported package versions are also rejected. See the [import API](../api.md#post-apiquestionsimport) for the complete package contract.

`meta` and `meta.authoredAt` are optional for every question. A supplied timestamp must
be a real ISO 8601 UTC date and time ending in `Z`, for example
`2026-10-16T12:00:00Z`, optionally with one to three fractional second digits. Imports
normalize timestamps to millisecond precision. Date-only values, timezone offsets,
and impossible calendar dates are rejected. Export omits unknown timestamps.

This is the date the author composed the question. It is stored separately from the
database record's `createdAt`. Existing and manually created questions have no known
author timestamp; normal edits preserve imported dates. The timestamp is read-only
in the admin overview and is excluded from public question responses.

## Parameters and configuration

The questions page has no feature-specific URL parameters or server settings. Form and package validation use the [question API contracts](../api.md#questions).

Mark an answer option with `⭐` to count it as correct for scoring. Stable question keys support imports and [presenter question selection](presenter.md#question-selection); generated IDs identify stored rows.

Question and option displays support the restricted Markdown described in the [create-question API](../api.md#post-apiquestionscreate). Use bold, italic, inline code, or fenced code; raw HTML does not become executable markup. The Presenter renders fenced code inline for projection.

## Behavior and limitations

Only one question is active at a time. Publication preserves answers and lock state. Unpublishing preserves answers; reopening voting and resetting answers are separate actions.

Automatic next-question selection follows the persisted queue, skips disabled items, and does not wrap after the last enabled question. With no active question, it starts at the first enabled item. A disabled question can still be published directly by an admin.

Questions remain editable after publication. Changing answer options when answers exist requires explicit reset confirmation; the update and answer deletion happen atomically. Editing text or notes without changing options retains answers. Package imports use the retention rules above. Deleted questions lose their answers; clearing all questions deletes all quiz answers.

## Examples

Create a draft with English question and option text, optionally add translations and a `⭐` option, then confirm publication. Lock voting before showing the correct answer. Unpublish to close the question while retaining answers.

Export a prepared queue, then import that file on another installation. Use new keys for new questions. Importing a key already present on the destination fails; edit an existing question through its admin editor.

## Implementation and verification

- [Questions page](../../app/pages/admin/questions.vue) and [admin composable](../../app/composables/useAdminQuestions.ts) own editing and lifecycle controls.
- [Import wizard](../../app/components/questions/QuestionPackageImportWizard.vue) and [package utilities](../../app/utils/question-package.ts) own preview and export.
- [Questions page tests](../../app/pages/admin/questions.test.ts), [wizard tests](../../app/components/questions/QuestionPackageImportWizard.test.ts), and [package tests](../../app/utils/question-package.test.ts) verify these workflows.
- [Quiz reset route tests](../../test/reset-quiz.integration.test.ts) verify authorization, validation, and confirmed live updates.
- [Storage tests](../../server/utils/storage.test.ts) verify queue ordering, atomic import conflicts, author timestamps, and answer retention; [validation tests](../../shared/utils/validation.test.ts) verify accepted input.
- [Quiz Markdown tests](../../app/components/questions/QuizMarkdownText.test.ts) and [renderer tests](../../app/utils/render-quiz-markdown.test.ts) verify formatting and sanitization.

## Related references

- [Feature Guide](README.md)
- [Presenter](presenter.md), [Results](results.md), and [Leaderboard](leaderboard.md)
- [Question API](../api.md#questions), [storage](../storage.md), and [development seeds](../predefined-questions.md)
