# Recap

## Overview

The recap summarizes final answers to previously published questions with aggregate quiz totals and up to four question highlights.

## Access and prerequisites

Use `/admin/recap` with [admin access](admin-access.md). Published questions and submitted answers determine which totals and highlights are available.

## Capabilities and controls

- Display participation totals, scored answers, correct answers, and overall accuracy.
- Show available best-known, hardest, most-answered, and closest-call highlights.
- Select the question-content language and limit the number of highlights.
- Refresh the data or embed the core presentation layout.

## Parameters and configuration

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| URL | `colorMode` | `light` / `dark` | `light` | Sets the local theme | Anything except a single `dark` value uses `light` |
| URL | `core` | Presence flag | Absent | Uses the presentation layout without the page title or admin back link | Any present value enables it |
| URL; core only | `padding` | Non-negative number, pixels | `0` | Adds content padding | Empty, negative, non-finite, or repeated values use `0` |
| URL; core only | `scale` | Positive finite number | `1` | Scales content | Empty, non-positive, non-finite, or repeated values use `1` |
| URL | `background` | Hex color `#RRGGBB` | Existing page background | Replaces page background | Invalid or repeated values preserve the background |
| URL | `refresh` | Non-negative integer, seconds | `5` | Polls recap data; `0` disables periodic refresh | Empty, negative, fractional, non-finite, or repeated values use `5` |
| URL | `count` | Single digit `1`–`4` | `4` | Limits available highlight cards | Empty, repeated, or other values use `4` |
| URL | `language` | Key from the shared language pool | Shared language selection | Selects question, option, and UI language | Empty, repeated, or unavailable keys use the shared selection defaults |

Missing field translations fall back directly to English; see [Languages](languages.md) for the shared pool and selection defaults. Encode `#` as `%23` in background URLs.

## Behavior and limitations

Recap includes previously published questions, including inactive ones. It uses the latest stored answer per participant and question. Accuracy uses answers to questions with a correct `⭐` option; it displays a dash when no scored answers exist.

Highlights appear only when the data supports them, so `count=4` can yield fewer than four cards. The response contains no participant identifiers or nicknames. After a successful load, a failed refresh leaves retained data visible with a refresh warning. Core mode retains that warning and its retry control.

## Examples

```text
/admin/recap
Standard recap with four highlights and five-second data refresh.

/admin/recap?core&padding=24&scale=0.9&colorMode=dark&count=4&refresh=0&language=de
Static German recap for a dark presentation frame.

/admin/recap?core&count=2&background=%23ffffff
Presentation recap limited to its first two available highlights on a white background.
```

For `background`, encode the `#` character as `%23` in URLs.

## Implementation and verification

- [Recap page](../../app/pages/admin/recap.vue) and [recap composable](../../app/composables/useAdminRecap.ts) own parameters and refresh behavior.
- [Recap calculation](../../server/utils/quiz-recap.ts) and [calculation tests](../../server/utils/quiz-recap.test.ts) verify totals and highlights.
- [Page tests](../../app/pages/admin/recap.test.ts) and [API tests](../../server/api/results/recap.get.test.ts) verify display and aggregate access.

## Related references

- [Feature Guide](README.md)
- [Questions](questions.md), [Leaderboard](leaderboard.md), and [Presenter](presenter.md)
- [Recap API](../api.md#get-apiresultsrecap) and [storage](../storage.md)
