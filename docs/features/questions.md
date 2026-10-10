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
- Delete an individual question or clear all questions after confirmation.
- Export questions to JSON or preview and confirm a package import.

### Question packages

Export downloads a Version 1 JSON package from the current server question list. It contains the format marker, version, ordered questions, stable keys, localized text, options, notes, and `is_disabled`. It excludes answers, generated technical IDs, and lifecycle state. Empty lists cannot be exported.

To import, open the question-creation dialog, choose package import, and select a JSON file. The wizard validates the file, refreshes the existing question list, and shows how many rows will be created or updated. Confirmation remains disabled until this preview is ready.

New or missing keys append questions to the queue. A matching key updates text, options, note, and disabled state while retaining answers and lifecycle state. The import is atomic. The preview warns that changing options can leave retained answers inconsistent with the displayed options. Duplicate non-empty keys and unsupported package versions are rejected. See the [import API](../api.md#post-apiquestionsimport) for the complete package contract.

## Parameters and configuration

The questions page has no feature-specific URL parameters or server settings. Form and package validation use the [question API contracts](../api.md#questions).

Mark an answer option with `⭐` to count it as correct for scoring. Stable question keys support imports and [scoped presenter selection](presenter.md#scoped-controller-and-display-modes); generated IDs identify stored rows.

Question and option displays support the restricted Markdown described in the [create-question API](../api.md#post-apiquestionscreate). Use bold, italic, inline code, or fenced code; raw HTML does not become executable markup. The legacy Presenter renders fenced code inline for projection.

## Behavior and limitations

Only one question is active at a time. Publication preserves answers and lock state. Unpublishing preserves answers; reopening voting and resetting answers are separate actions.

Automatic next-question selection follows the persisted queue, skips disabled items, and does not wrap after the last enabled question. With no active question, it starts at the first enabled item. A disabled question can still be published directly by an admin.

Questions remain editable after publication. Changing answer options when answers exist requires explicit reset confirmation; the update and answer deletion happen atomically. Editing text or notes without changing options retains answers. Package imports use the retention rules above. Deleted questions lose their answers; clearing all questions deletes all quiz answers.

## Examples

Create a draft with English question and option text, optionally add translations and a `⭐` option, then confirm publication. Lock voting before showing the correct answer. Unpublish to close the question while retaining answers.

Export a prepared queue, then import that file on another installation. Retain stable keys when updating the same questions; use new keys when adding different questions. Inspect the import warning before confirming option changes.

## Implementation and verification

- [Questions page](../../app/pages/admin/questions.vue) and [admin composable](../../app/composables/useAdminQuestions.ts) own editing and lifecycle controls.
- [Import wizard](../../app/components/questions/QuestionPackageImportWizard.vue) and [package utilities](../../app/utils/question-package.ts) own preview and export.
- [Questions page tests](../../app/pages/admin/questions.test.ts), [wizard tests](../../app/components/questions/QuestionPackageImportWizard.test.ts), and [package tests](../../app/utils/question-package.test.ts) verify these workflows.
- [Storage tests](../../server/utils/storage.test.ts) verify queue ordering, answer retention, and imports; [validation tests](../../shared/utils/validation.test.ts) verify accepted input.
- [Quiz Markdown tests](../../app/components/questions/QuizMarkdownText.test.ts) and [renderer tests](../../app/utils/render-quiz-markdown.test.ts) verify formatting and sanitization.

## Related references

- [Feature Guide](README.md)
- [Presenter](presenter.md), [Results](results.md), and [Leaderboard](leaderboard.md)
- [Question API](../api.md#questions), [storage](../storage.md), and [development seeds](../predefined-questions.md)
