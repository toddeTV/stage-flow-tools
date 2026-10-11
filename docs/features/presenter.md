# Presenter

## Overview

The Presenter runs the quiz in its existing question-and-results layout. Select a starting question, limit the number of questions, and enable the leaderboard and recap independently. The same view supports live exercise status and read-only previews.

## Access and prerequisites

Use `/admin/presenter` with [admin access](admin-access.md). Sign in at the Stage Flow origin before opening an embedded presentation. Its session cookie must be available inside the iframe. Credentials are never sent to the slideshow or child frames.

Parent-managed selection requires exact slideshow origins in `NUXT_PRESENTER_PARENT_ORIGINS`. This permission is independent of REST API CORS. Keep one controlling slideshow tab; other views use `readOnly=true`.

## Capabilities and controls

The default sequence remains question open → question revealed → next question → leaderboard → recap. Left/right arrow keys and the existing navigation buttons follow this sequence. The right arrow reveals and locks a quiz question; the left arrow from reveal opens it again. **Reopen voting** explicitly activates the displayed question with its retained answers. **Close voting** closes only the question owned by this Presenter.

`mode=status` shows option counts continuously in the existing panels without locking votes or showing correct-answer markers and discussion notes. Advancing goes straight to the next question or enabled endscreen. The compact workshop slot uses the same panels with smaller spacing. Avoid the scoring marker `⭐` on status options. “Finished” means that option's count, not connections or all responses.

Read-only views show the selected question and aggregates, including saved results for closed questions. They expose no voting or navigation controls. Language selection and discussion notes remain available.

## Question selection

`questionKey` is a stable question-package key, not a generated database ID. It starts the flow at that enabled question and excludes preceding questions. `questionCount` independently limits the number of enabled questions. An absent count includes all remaining questions. A count-only selection starts at the active question, or the first enabled question when none is active. Without either parameter the original active-question resume behavior remains.

Questions stay in persisted queue order. Disabled questions are skipped. A count beyond the available questions stops at the list end; it never wraps. Invalid counts and unknown or disabled keys show an error without publishing anything.

At the block end, show the enabled leaderboard and recap in that order. Backward navigation skips disabled endscreens too. Their aggregates still cover the entire published quiz session. Crossing the first or last available step sends a slideshow boundary message.

## Parameters and configuration

| Name | Allowed values | Default | Effect |
| --- | --- | --- | --- |
| `questionKey` | Non-empty stable key | Absent | Selects the entry question |
| `questionCount` | Positive safe integer | Absent | Limits enabled questions from the entry |
| `showLeaderboard` | `true` / `false` | `true` | Enables the leaderboard step |
| `showRecap` | `true` / `false` | `true` | Enables the recap step |
| `mode` | `quiz` / `status` | `quiz` | Quiz phases or live status counts |
| `readOnly` | `true` / `false` | `false` | Prevents every Presenter write |
| `parentManaged` | `true` / `false` | `false` | Waits for trusted parent selection instead of starting automatically |

Malformed or repeated selection and boolean parameters fail without writes. Removed `embed=controller` and `embed=display` URLs also fail without writes. All existing visual parameters continue to configure this single Presenter view:

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| Presenter URL | `background` | Hex color (`#RRGGBB`) | Theme default | Overrides the presenter viewport background in both color modes. It is not forwarded to embedded pages. | Invalid or repeated values leave the override unset |
| Presenter URL | `colorMode` | `light` \| `dark` | `light` | Sets the local quiz theme and the inherited leaderboard and recap themes. | Invalid or repeated values use the default or inherited theme |
| Presenter URL | `foregroundOpacity` | Number, clamped to `0`–`1` | `1` | Multiplies panel opacity without changing text or control opacity. | Finite values clamp; empty, non-finite, or repeated values use the default |
| Presenter URL | `foregroundInsetX` | Non-negative number in pixels | `56` | Sets horizontal quiz content insets. | Empty, negative, non-finite, or repeated values use the default |
| Presenter URL | `foregroundInsetY` | Non-negative number in pixels | `40` | Sets vertical quiz content insets, plus space reserved for the controls. | Empty, negative, non-finite, or repeated values use the default |
| Presenter URL | `textScale` | Positive number | `1` | Scales quiz typography and presenter controls. | Empty, non-positive, non-finite, or repeated values use the default |
| Presenter URL | `language` | Locale string | Automatic | Selects question content language before the browser preference. A manual picker choice updates `language` in the current URL while preserving its other parameters. | Empty or repeated values use browser preference; unavailable translations fall through |
| Presenter URL | `presenterRefresh` | Non-negative number in seconds | `2` | Refreshes presenter state at a decimal interval. Use `0` to disable periodic polling. Values between `0` and `0.1` use `0.1`. | Positive values below `0.1` clamp; empty, negative, non-finite, or repeated values use `2` |
| Presenter URL | `stageScale` | Positive number | `1` | Scales the complete virtual presenter stage. Values below `1` create more logical space; values above `1` enlarge the interface. | Empty, non-positive, non-finite, non-invertible, or repeated values use `1` |
| Presenter URL | `emojiLayer` | `background` \| `foreground` \| `none` | `background` | Places emoji below or above presentation content, or omits the emoji iframe entirely. `none` prevents the emoji WebSocket connection and animation from starting. Emoji layers never accept pointer input. | Invalid or repeated values use the default or inherited theme |
| Presenter URL | `emojiScale` | Positive number | `0.3` | Passes `scale` to the embedded `/admin/emojis` page. | Empty, non-positive, non-finite, or repeated values use the default |
| Presenter URL | `emojiOpacity` | Number, clamped to `0`–`1` | `0.8` | Passes `transparency` to the embedded emoji page. | Finite values clamp; empty, non-finite, or repeated values use the default |
| Presenter URL | `emojiBackground` | Hex color (`#RRGGBB`) | Transparent | Passes `background` to the embedded emoji page. | Invalid or repeated values leave the override unset |
| Presenter URL | `leaderboardCore` | `true` / `false` | `false` | Passes the existing `core` flag to the leaderboard when `true`. | Invalid or repeated values use the default |
| Presenter URL | `leaderboardPadding` | Non-negative number in pixels | `0` | Passes `padding` to the leaderboard. | Empty, negative, non-finite, or repeated values use the default |
| Presenter URL | `leaderboardScale` | Positive number | `1` | Passes `scale` to the leaderboard. | Empty, non-positive, non-finite, or repeated values use the default |
| Presenter URL | `leaderboardBackground` | Hex color (`#RRGGBB`) | Not set | Passes `background` to the leaderboard. | Invalid or repeated values leave the override unset |
| Presenter URL | `leaderboardShowUserId` | `true` / `false` | `false` | Passes `showUserId` to the leaderboard. Set it to `true` to show technical participant IDs. | Invalid or repeated values use the default |
| Presenter URL | `leaderboardRefresh` | Non-negative integer in seconds | `5` | Passes `refresh` to the leaderboard. Use `0` to disable polling. | Empty, negative, fractional, non-finite, or repeated values use `5` |
| Presenter URL | `leaderboardColorMode` | `light` \| `dark` | Inherits `colorMode` | Overrides only the embedded leaderboard theme. | Invalid or repeated values use the default or inherited theme |
| Presenter URL | `recapCore` | `true` / `false` | `false` | Passes the existing `core` flag to the recap when `true`. | Invalid or repeated values use the default |
| Presenter URL | `recapPadding` | Non-negative number in pixels | `0` | Passes `padding` to the recap. | Empty, negative, non-finite, or repeated values use the default |
| Presenter URL | `recapScale` | Positive number | `1` | Passes `scale` to the recap. | Empty, non-positive, non-finite, or repeated values use the default |
| Presenter URL | `recapBackground` | Hex color (`#RRGGBB`) | Not set | Passes `background` to the recap. | Invalid or repeated values leave the override unset |
| Presenter URL | `recapRefresh` | Non-negative integer in seconds | `5` | Passes `refresh` to the recap. Use `0` to disable polling. | Empty, negative, fractional, non-finite, or repeated values use `5` |
| Presenter URL | `recapCount` | Integer from `1` to `4` | `4` | Limits the number of embedded recap highlights. | Empty, repeated, or values outside integers 1–4 use `4` |
| Presenter URL | `recapColorMode` | `light` \| `dark` | Inherits `colorMode` | Overrides only the embedded recap theme. | Invalid or repeated values use the default or inherited theme |

Legacy numeric and enum inputs fall back rather than rejecting the entire page. Unknown query keys are not forwarded to child frames. The content language resolves through URL preference, browser locale, English, then the first available translation. The chosen language also reaches the recap. A manual language-picker choice updates the URL while preserving other parameters.

`NUXT_PRESENTER_PARENT_ORIGINS` is a comma-separated list of exact HTTP(S) origins, for example `http://localhost:3030`. Empty disables parent messages. Wildcards, paths, credentials, query strings, and fragments are rejected. See [`.env.example`](../../.env.example).

## Behavior and limitations

Publishing, closing, locking, and reopening retain submitted answers. Resetting answers remains a separate admin action. A scoped selection of an already-published inactive question shows its stored results and stays closed until an explicit reopen/navigation action. Focus and polling do not silently reopen it.

Explicitly closing a question also keeps its saved results visible in the regular Presenter. Polling and window focus preserve the close until an explicit reopen, navigation, or new selection.

`presenterRefresh=0` disables periodic polling; initial loads and navigation remain available. A failed refresh keeps the last successful state for the same question. Obsolete requests never replace another selection's results. Writes are serialized, and newer parent contexts discard obsolete pending work.

`stageScale` creates logical dimensions of iframe width/scale by iframe height/scale. The regular two-column layout activates above 860 logical pixels. Compact frames reuse both panels side by side with scrollable answer content. Child iframe scale settings remain independent.

Close voting before quitting a presentation. Browser unload cannot guarantee completion of asynchronous requests. The parent slideshow stays navigable when authentication, configuration, or networking fails.

## Examples

```text
/admin/presenter
/admin/presenter?questionKey=example&questionCount=1&showLeaderboard=false&showRecap=false
/admin/presenter?questionKey=example&questionCount=3&showLeaderboard=false
/admin/presenter?questionKey=exercise&questionCount=1&mode=status&readOnly=true&language=de
/admin/presenter?colorMode=dark&emojiLayer=none&stageScale=0.7
/admin/presenter?parentManaged=true&readOnly=false&showLeaderboard=false&showRecap=false
```

## Parent-managed slideshow integration

Use one persistent iframe, showing the existing Presenter at the active quiz/status slide's placeholder. Hide it on ordinary slides while keeping it mounted so closing can finish. Notes and secondary tabs use their own read-only persistent frame. The workshop uses one question per context and disables both endscreens.

Load `/admin/presenter?parentManaged=true` with the appropriate immutable `readOnly` role. The Presenter waits for selection and does not automatically publish on load or focus. The authenticated `/api/admin/presenter/embed-config` provides the permitted parent origins.

Connect with `{ type: 'stage-flow-tools:connect', sessionId }` and wait for `{ type: 'stage-flow-tools:ready', sessionId }`. Session IDs contain 1–100 characters. An early connect is buffered until authenticated configuration is available.

Send `{ type: 'stage-flow-tools:context', sessionId, requestId, selection }`, where `selection` is `{ questionKey, questionCount?, mode }` or `null`. Mode defaults to `quiz`; request IDs are strictly increasing positive safe integers. Context never changes `readOnly`, endscreen flags, or authentication. Dedicated external action commands have been removed; use the visible Presenter controls.

The acknowledgement is `{ type: 'stage-flow-tools:ack', sessionId, requestId, questionKey, status }`. The key is `null` for closing; status is `ready`, `closed`, or `error`. Only the newest request is acknowledged, after synchronization. Parents validate the iframe source, Stage Flow origin, session, and request before accepting replies. The Presenter validates its parent window, exact configured origin, and strict message schema.

A first selection of an unpublished question activates it and opens voting. Already-active quiz questions keep their lock state; status mode opens voting. Published inactive questions stay closed in both modes. Changing context closes only the previously owned question using the atomically checked expected-key operation. `null` closes it and clears the selected view.

## Slidev boundary wrapper

At a forward or backward boundary the Presenter sends `{ type: 'stage-flow-tools:presenter-boundary', direction: 'next' | 'previous' }`. Validate both `event.origin` and `event.source === iframe.contentWindow` before calling Slidev `nextSlide()` or `prevSlide(true)`. Read-only frames emit no navigation requests. Keep focus on the active frame for its internal arrow-key navigation.

## Implementation and verification

The [Presenter route](../../app/pages/admin/presenter.vue), existing Presenter components, [controller](../../app/composables/presenter/controller.ts), and [parameter parser](../../app/utils/presenter-parameters.ts) own layout, flow, and polling. Their colocated tests cover selection, phases, read-only behavior, terminal flags, and confirmed mutations. The parent bridge and lifecycle tests cover trusted messages and asynchronous startup.

## Related references

- [Questions](questions.md), [Results](results.md), [Leaderboard](leaderboard.md), and [Recap](recap.md)
- [API](../api.md) and [URL parameters](../url-parameters.md)
