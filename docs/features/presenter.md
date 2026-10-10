# Presenter

## Overview

The Presenter runs the complete quiz sequence in one frame or separates slideshow control from selected-question displays. Choose the mode that matches the presentation workflow.

## Access and prerequisites

Use `/admin/presenter` with [admin access](admin-access.md). Sign in at the Stage Flow origin before entering an embedded presentation; browser privacy settings must allow the session cookie inside the iframe. Shared token-bootstrap rules are described in the admin guide. The Presenter never forwards a token to its child frames.

A scoped controller also requires an exact slideshow origin in `NUXT_PRESENTER_PARENT_ORIGINS`. Keep its iframe mounted across slide changes and use one controlling slideshow tab. Notes and previews must use read-only displays.

## Capabilities and controls

### Legacy quiz sequence

With no `embed` parameter, the Presenter runs enabled questions in persisted queue order, then the leaderboard and recap. Navigation buttons and left/right arrow keys follow this sequence:

```text
Question 1 open → Question 1 revealed → Question 2 open → … → Last question revealed → Leaderboard → Recap
```

Backward navigation reverses it. Crossing the first or last internal step sends a boundary message to the parent slideshow. This mode publishes questions and synchronizes voting locks; it is an administrative workflow.

### Scoped controller and display modes

`embed=controller` is a persistent authenticated bridge. It does not start the legacy queue. It accepts messages only from its parent window and exact configured origins. A first visit publishes an unpublished enabled question and opens voting. An already-active question retains its lock state; a previously published inactive question stays closed. Explicit actions reveal or reopen voting without resetting answers.

`embed=display` is read-only and selects a question by its stable package key rather than its generated ID. It displays aggregates for enabled active or inactive questions without publishing, reopening, or changing shared quiz state.

- `mode=quiz` shows option counts, the correct-answer marker, and the note when voting is locked or a previously published question is inactive.
- `mode=status` shows counts continuously, including the exact English `Finished` option count separately from all responses. Use `Finished` as the option's `text.en`; avoid `⭐` on status options so they do not contribute quiz scores.
- `compact=true` reduces spacing and typography for a status display.

## Parameters and configuration

### Legacy parameters

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| Legacy URL | `background` | Hex color (`#RRGGBB`) | Theme default | Overrides the presenter viewport background in both color modes. It is not forwarded to embedded pages. | Invalid or repeated values leave the override unset |
| Legacy URL | `colorMode` | `light` \| `dark` | `light` | Sets the local quiz theme and the inherited leaderboard and recap themes. | Invalid or repeated values use the default or inherited theme |
| Legacy URL | `foregroundOpacity` | Number, clamped to `0`–`1` | `1` | Multiplies panel opacity without changing text or control opacity. | Finite values clamp; empty, non-finite, or repeated values use the default |
| Legacy URL | `foregroundInsetX` | Non-negative number in pixels | `56` | Sets horizontal quiz content insets. | Empty, negative, non-finite, or repeated values use the default |
| Legacy URL | `foregroundInsetY` | Non-negative number in pixels | `40` | Sets vertical quiz content insets. The fixed 18-pixel lower reserve remains. | Empty, negative, non-finite, or repeated values use the default |
| Legacy URL | `textScale` | Positive number | `1` | Scales quiz typography and presenter controls. | Empty, non-positive, non-finite, or repeated values use the default |
| Legacy URL | `language` | Locale string | Automatic | Selects question content language before the browser preference. A manual picker choice updates `language` in the current URL while preserving its other parameters. | Empty or repeated values use browser preference; unavailable translations fall through |
| Legacy URL | `presenterRefresh` | Non-negative number in seconds | `2` | Refreshes presenter state at a decimal interval. Use `0` to disable periodic polling. Values between `0` and `0.1` use `0.1`. | Positive values below `0.1` clamp; empty, negative, non-finite, or repeated values use `2` |
| Legacy URL | `stageScale` | Positive number | `1` | Scales the complete virtual presenter stage. Values below `1` create more logical space; values above `1` enlarge the interface. | Empty, non-positive, non-finite, non-invertible, or repeated values use `1` |
| Legacy URL | `emojiLayer` | `background` \| `foreground` \| `none` | `background` | Places emoji below or above presentation content, or omits the emoji iframe entirely. `none` prevents the emoji WebSocket connection and animation from starting. Emoji layers never accept pointer input. | Invalid or repeated values use the default or inherited theme |
| Legacy URL | `emojiScale` | Positive number | `0.3` | Passes `scale` to the embedded `/admin/emojis` page. | Empty, non-positive, non-finite, or repeated values use the default |
| Legacy URL | `emojiOpacity` | Number, clamped to `0`–`1` | `0.8` | Passes `transparency` to the embedded emoji page. | Finite values clamp; empty, non-finite, or repeated values use the default |
| Legacy URL | `emojiBackground` | Hex color (`#RRGGBB`) | Transparent | Passes `background` to the embedded emoji page. | Invalid or repeated values leave the override unset |
| Legacy URL | `leaderboardCore` | `true` / `false` | `false` | Passes the existing `core` flag to the leaderboard when `true`. | Invalid or repeated values use the default |
| Legacy URL | `leaderboardPadding` | Non-negative number in pixels | `0` | Passes `padding` to the leaderboard. | Empty, negative, non-finite, or repeated values use the default |
| Legacy URL | `leaderboardScale` | Positive number | `1` | Passes `scale` to the leaderboard. | Empty, non-positive, non-finite, or repeated values use the default |
| Legacy URL | `leaderboardBackground` | Hex color (`#RRGGBB`) | Not set | Passes `background` to the leaderboard. | Invalid or repeated values leave the override unset |
| Legacy URL | `leaderboardShowUserId` | `true` / `false` | `false` | Passes `showUserId` to the leaderboard. Set it to `true` to show technical participant IDs. | Invalid or repeated values use the default |
| Legacy URL | `leaderboardRefresh` | Non-negative integer in seconds | `5` | Passes `refresh` to the leaderboard. Use `0` to disable polling. | Empty, negative, fractional, non-finite, or repeated values use `5` |
| Legacy URL | `leaderboardColorMode` | `light` \| `dark` | Inherits `colorMode` | Overrides only the embedded leaderboard theme. | Invalid or repeated values use the default or inherited theme |
| Legacy URL | `recapCore` | `true` / `false` | `false` | Passes the existing `core` flag to the recap when `true`. | Invalid or repeated values use the default |
| Legacy URL | `recapPadding` | Non-negative number in pixels | `0` | Passes `padding` to the recap. | Empty, negative, non-finite, or repeated values use the default |
| Legacy URL | `recapScale` | Positive number | `1` | Passes `scale` to the recap. | Empty, non-positive, non-finite, or repeated values use the default |
| Legacy URL | `recapBackground` | Hex color (`#RRGGBB`) | Not set | Passes `background` to the recap. | Invalid or repeated values leave the override unset |
| Legacy URL | `recapRefresh` | Non-negative integer in seconds | `5` | Passes `refresh` to the recap. Use `0` to disable polling. | Empty, negative, fractional, non-finite, or repeated values use `5` |
| Legacy URL | `recapCount` | Integer from `1` to `4` | `4` | Limits the number of embedded recap highlights. | Empty, repeated, or values outside integers 1–4 use `4` |
| Legacy URL | `recapColorMode` | `light` \| `dark` | Inherits `colorMode` | Overrides only the embedded recap theme. | Invalid or repeated values use the default or inherited theme |

Legacy numeric and enum inputs fall back rather than rejecting the entire page. Unknown query keys are not forwarded to child frames. The content language resolves through URL preference, browser locale, English, then the first available translation. The chosen language also reaches the recap. A manual language-picker choice updates the URL while preserving other parameters.

### Embed parameters

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| Presenter URL | `embed` | Absent / `controller` / `display` | Absent; legacy sequence | Selects the presenter implementation | Other values show an invalid-mode message |
| Display URL | `questionKey` | Non-empty stable package key | Required | Selects an enabled question's aggregates | Empty or repeated values fail loading; unknown or disabled keys return an API error |
| Display URL | `mode` | `quiz` / `status` | `quiz` | Selects quiz or exercise-progress presentation | Unsupported values fail loading; use one value |
| Display URL; status only | `compact` | `true` / `false` | `false` | Uses compact status layout | Anything except a single `true` value leaves it off |
| Display URL | `language` | Locale string | Browser language | Selects localized question, option, and note text | Empty or repeated values use browser preference; unavailable translations fall through |
| Display URL | `colorMode` | `light` / `dark` | `light` | Sets the display theme | Invalid or repeated values use `light` |
| Display URL | `presenterRefresh` | Non-negative number, seconds | `2` | Polls selected aggregates; `0` disables periodic polling | Positive values below `0.1` clamp; empty, negative, non-finite, or repeated values use `2` |
| Controller runtime | `NUXT_PRESENTER_PARENT_ORIGINS` | Comma-separated exact HTTP(S) origins | Empty; parent control disabled | Allows trusted slideshow parents | Origin configuration rejects wildcards, paths, credentials, and non-origin values |

The display consumes only its selection, mode, compact setting, language, theme, and refresh interval. Legacy background, stage scaling, emoji, leaderboard, and recap parameters do not configure it. The controller has no legacy display settings. See [`.env.example`](../../.env.example) for the server configuration contract.

## Behavior and limitations

### Legacy synchronization and scaling

`presenterRefresh=0` disables periodic polling; initial loading, focus refreshes, and navigation still synchronize state. The legacy mode can open voting when navigating backward to an open question. Publishing, closing, and reopening retain answers; answer reset is a separate admin action.

`stageScale` uses iframe dimensions automatically. Logical dimensions are `iframe width / stageScale` by `iframe height / stageScale`. The two-column quiz layout activates above 860 logical pixels: a 640-pixel-wide iframe with `stageScale=0.7` has about 914 logical pixels. Stage scaling is not forwarded to child pages; their individual scale settings apply in addition to it. Extremely small or large values can make content hard to read or increase rendering cost.

### Scoped lifecycle

The controller closes only its owned question when context changes, using the expected-key close operation. Operations are serialized; newer context supersedes pending work for an older selection. No bridge operation resets answers. A previously published inactive question remains closed until an explicit `reopen` action.

A display loads once, refreshes on selected-key changes, and optionally polls. Quiz counts are hidden during open voting; status counts are always visible. A failed refresh retains the last valid state for the same question with a connection warning. A response for another key is never shown as the selected question's results.

Close voting before quitting the presentation. Browser unload cannot guarantee asynchronous cleanup; destroying the controller stops processing but does not reliably close voting. Expired authentication, rejected origins, and disconnected frames must leave the parent slideshow navigable.

### Controller messaging

Connect with `stage-flow-tools:connect` and a `sessionId` of 1–100 characters; wait for `stage-flow-tools:ready` with the same session. The controller initializes asynchronously after loading its configuration and buffers an early connect message. An iframe load event does not establish a session; wait for ready and retry the handshake if no reply arrives. A controller accepts one session; recreate its frame to start a different session.

After ready, send `stage-flow-tools:context` with the session, a strictly increasing positive safe integer `requestId`, and `selection: { questionKey, mode }`, or `null` to leave. Send `stage-flow-tools:action` for the selected key with `action: reveal|reopen`. Invalid or extra payload fields, untrusted sources, stale request IDs, and mismatched sessions are ignored. Acknowledgements contain the session, request ID, selected key (or `null`), and `status: ready|closed|error`. Parents must validate iframe source, Stage Flow origin, session, and request before using a reply. `ready` acknowledges processed selection; it does not mean that an inactive question was reopened.

## Examples

### Legacy URLs

```text
/admin/presenter
Light quiz layout with background emojis and a leaderboard without technical participant IDs.

/admin/presenter?emojiLayer=none
Quiz layout without an emoji iframe, connection, or animation.

/admin/presenter?colorMode=dark&emojiLayer=foreground&foregroundOpacity=0.85
Dark quiz layout with click-through emoji reactions above the content.

/admin/presenter?colorMode=dark&background=%23020417
Dark quiz layout with a custom presenter background.

/admin/presenter?foregroundInsetX=32&foregroundInsetY=24&textScale=1.15&language=de
German question content with smaller insets and larger quiz text.

/admin/presenter?presenterRefresh=0.5
Standard quiz flow with presenter results refreshed every half-second.

/admin/presenter?stageScale=0.7
More logical space for retaining the two-column quiz layout in a small iframe.

/admin/presenter?leaderboardCore=true&leaderboardPadding=24&leaderboardScale=0.9&leaderboardShowUserId=true
Standard quiz flow with a projector-oriented leaderboard and explicitly enabled technical IDs.

/admin/presenter?recapCore=true&recapPadding=24&recapScale=0.9&recapCount=2&recapRefresh=0
Standard quiz flow with a static, projector-oriented recap limited to two highlights.
```

Encode `#` as `%23` when using any background parameter.

### Slidev boundary wrapper

The presenter sends this message after it crosses its first or last internal step:

```ts
type PresenterBoundaryMessage = {
  type: 'stage-flow-tools:presenter-boundary'
  direction: 'previous' | 'next'
}
```

Use a wrapper component like the following in Slidev. Replace the URL with the deployed Stage Flow Tools origin.
The wrapper focuses the iframe when its slide becomes active and accepts messages only from that iframe and origin.

```vue
<script setup lang="ts">
import { onSlideEnter, useNav } from '@slidev/client'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const presenterUrl = 'https://quiz.example.com/admin/presenter'
const presenterOrigin = new URL(presenterUrl).origin
const presenterFrame = ref<HTMLIFrameElement>()
const nav = useNav()

function focusPresenter() {
  presenterFrame.value?.contentWindow?.focus()
}

function handlePresenterBoundary(event: MessageEvent) {
  if (event.origin !== presenterOrigin || event.source !== presenterFrame.value?.contentWindow) return
  if (!event.data || event.data.type !== 'stage-flow-tools:presenter-boundary') return

  if (event.data.direction === 'next') void nav.nextSlide()
  if (event.data.direction === 'previous') void nav.prevSlide(true)
}

onMounted(() => window.addEventListener('message', handlePresenterBoundary))
onBeforeUnmount(() => window.removeEventListener('message', handlePresenterBoundary))
onSlideEnter(focusPresenter)
</script>

<template>
  <iframe
    ref="presenterFrame"
    class="absolute inset-0 h-full w-full border-0"
    :src="presenterUrl"
    title="Live quiz"
    @load="focusPresenter"
  />
</template>
```

`nextSlide()` and `prevSlide(true)` come from Slidev's
[`useNav()` navigation API](https://github.com/slidevjs/slidev/blob/main/packages/client/composables/useNav.ts).

### Scoped URLs

```text
/admin/presenter?embed=controller
Persistent control bridge; keep this iframe outside individual slide lifecycles.

/admin/presenter?embed=display&questionKey=example-quiz&mode=quiz&colorMode=dark
Read-only selected quiz display.

/admin/presenter?embed=display&questionKey=example-exercise&mode=status&compact=true&language=de&presenterRefresh=0.5
Compact exercise progress with half-second updates; text.en must include Finished.

/admin/presenter?embed=display&questionKey=example-quiz&mode=quiz&presenterRefresh=0
Selected quiz display with initial and key-change loading, without periodic polling.
```

Configure the controller's trusted parent origin, for example `NUXT_PRESENTER_PARENT_ORIGINS=http://localhost:3030`. This setting is independent of REST CORS. A read-only display does not require parent control permission.

### Scoped message sequence

In the parent, send each payload with `controllerFrame.contentWindow.postMessage(payload, stageFlowOrigin)`. Receive and validate replies from that frame and origin. Retry the first message until its matching ready reply, then send subsequent requests with increasing IDs. These synthetic payloads demonstrate opening a selected question, revealing it, and leaving:

```json
{ "type": "stage-flow-tools:connect", "sessionId": "example-session" }
```

After the matching ready reply:

```json
{ "type": "stage-flow-tools:context", "sessionId": "example-session", "requestId": 1, "selection": { "questionKey": "example-quiz", "mode": "quiz" } }
```

After the matching acknowledgement, reveal or explicitly reopen the selected question:

```json
{ "type": "stage-flow-tools:action", "sessionId": "example-session", "requestId": 2, "questionKey": "example-quiz", "action": "reveal" }
```

Leave the selection before ending the presentation and wait for the close acknowledgement:

```json
{ "type": "stage-flow-tools:context", "sessionId": "example-session", "requestId": 3, "selection": null }
```

## Implementation and verification

- [Presenter route](../../app/pages/admin/presenter.vue), [legacy view](../../app/components/presenter/PresenterLegacy.vue), and [legacy controller](../../app/composables/usePresenterQuiz.ts) own mode dispatch and queue synchronization.
- [Parameter parser](../../app/utils/presenter-parameters.ts) and [parameter tests](../../app/utils/presenter-parameters.test.ts) verify legacy defaults and child URLs; [legacy tests](../../app/composables/usePresenterQuiz.test.ts) verify navigation.
- [Embed controller component](../../app/components/presenter/PresenterEmbedController.vue), [bridge](../../app/utils/presenter-embed-controller.ts), and [bridge tests](../../app/utils/presenter-embed-controller.test.ts) verify trusted sessions and scoped state changes.
- [Embed display](../../app/components/presenter/PresenterEmbedDisplay.vue) and [display tests](../../app/components/presenter/PresenterEmbedDisplay.test.ts) verify selected-key rendering and retained status counts.
- [Boundary tests](../../shared/utils/presenter-embed.test.ts) and [selected-state API tests](../../server/api/admin/presenter/question-state.get.test.ts) cover input validation and authenticated aggregates.

## Related references

- [Feature Guide](README.md)
- [Questions](questions.md), [Results](results.md), [Leaderboard](leaderboard.md), [Recap](recap.md), and [Emojis](emojis.md)
- [Scoped presentation API](../api.md#scoped-presentation-embeds), [WebSockets](../websocket.md), and [admin access](admin-access.md)
