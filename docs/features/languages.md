# Languages

## Overview

Question translations determine the available languages. The global switcher and Presenter picker use the same pool from all stored questions, including disabled questions and questions outside the current Presenter selection.

## Access and prerequisites

Language selection is available on public and admin pages. Admin pages still require [admin access](admin-access.md). Question and answer text requires a non-empty English value.

## Capabilities and controls

- Collect populated language keys from question text, answer options, and notes.
- Select a language in the dropdown or through the `language` URL parameter.
- Show known languages with their native names and representative flags; unknown keys appear unchanged with no flag.
- Preserve the selected language when switching questions or navigating within the app.

## Parameters and configuration

| Scope | Name | Allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| All page URLs | `language` | One language key from the shared pool | Previous selection, existing UI language path, browser language, then English | Selects question content and the corresponding UI language | Empty, repeated, or unavailable keys are ignored |

Keys are compared without surrounding whitespace or case differences. Regional keys remain separate: `de-DE` and `de` are different content languages. Browser preference can match its base language when the regional key is unavailable. Existing `/de`, `/fr`, and `/ja` language paths remain supported.

The pool is fetched once per full page load through the public [language metadata API](../api.md#get-apiquestionslocales). Reload the page after changing question translations. There is no periodic refresh or WebSocket language update. Empty or failed loads offer English.

## Behavior and limitations

Each field uses the selected translation, then English, then an empty string. A missing regional translation falls directly back to English. An optional note without the selected language or English stays empty. Selecting a language does not require every question or answer to have that translation.

The UI uses its existing translations for English, German, French, and Japanese. A regional key can use its base UI language; other languages use English buttons and messages. Question translations do not generate UI translations.

Dropdown changes preserve other URL parameters and the fragment. The Presenter passes the selected language to its emoji, leaderboard, and recap frames. Internal navigation carries the selection in the URL.

## Examples

Open `/?language=es` when any stored question contains a populated `es` translation. Spanish question text appears where available; missing translations and the UI use English.

An unknown key such as `xx` appears as `xx` without a flag when it has a populated translation. Select it with `?language=xx`.

## Implementation and verification

- [Shared language state](../../app/composables/useQuestionLanguage.ts) owns selection and the initial metadata request.
- [Translation utilities](../../shared/utils/question-locales.ts) collect keys and resolve text.
- [Integration tests](../../test/question-language.integration.test.ts) cover URL and dropdown selection, UI fallback, navigation, and failed loads.

## Related references

- [Participation](participation.md), [Presenter](presenter.md), and [Recap](recap.md)
- [Questions](questions.md) and [API reference](../api.md)
