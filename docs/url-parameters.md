# URL Parameters for Frontend pages

This document describes the GET parameters available for customizing page views.

## `/admin/results` Page

### `core`

- **Type**: Flag (presence check)
- **Default**: Not set
- **Effect**: Enables core view mode, which removes page padding, removes the page title, and applies bare section styling for embedded display.

### `padding`

- **Type**: Number (pixels)
- **Default**: `0`
- **Effect**: Applies padding around the content when in core view mode. Only active when `core` parameter is present.

### `scale`

- **Type**: Number (decimal)
- **Default**: `1`
- **Effect**: Applies CSS transform scale to the content. Only active when `core` parameter is present.

### `visibility`

- **Type**: String (`hide` | `show`)
- **Default**: `hide`
- **Effect**: Controls how results behave when a new question is published.
  - `hide` - Results are hidden whenever a new question appears. The admin can reveal them manually.
  - `show` - Results are shown immediately when a new question appears.

### `scramble`

- **Type**: String (`hide` | `show`)
- **Default**: `show`
- **Effect**: Controls whether answers are scrambled (anonymized) when a new question is published.
  - `hide` - Answers are scrambled on each new question: answer texts are replaced with `?`, emojis are hidden, and the display order is randomized. Bars and vote counts remain visible ("Stimmungsbild" mode).
  - `show` - Answers are displayed normally (not scrambled) on each new question.
  - The admin can toggle scrambling manually via the "Scramble" checkbox regardless of this default.
  - When both `visibility=hide` and `scramble=hide` are active, the strictest hiding applies per element (bars and counts show `?`, answers show `?`, order is randomized).

### Examples

```text
/admin/results
Standard results view. Results hidden on new questions (default: hide), no scrambling.

/admin/results?core
Core view with minimal UI, no padding, normal scale.

/admin/results?core&padding=20&scale=0.9
Core view with 20px padding and 90% scale.

/admin/results?core&visibility=hide
Core view with results hidden on each new question.

/admin/results?core&visibility=show
Core view with results shown immediately on each new question.

/admin/results?core&scramble=hide
Core view with answers scrambled on each new question (Stimmungsbild mode).

/admin/results?core&visibility=hide&scramble=hide
Core view with results hidden and answers scrambled on each new question.

/admin/results?core&padding=30&scale=1.2&visibility=hide
Core view with 30px padding, 120% scale, and hidden results.
```

## `/admin/emojis` Page

### `scale`

- **Type**: Number (decimal)
- **Default**: `1`
- **Effect**: Scales emoji size and adjusts spawn padding to prevent emojis from appearing outside viewport.

### `transparency`

- **Type**: Number (decimal, clamped to `0`–`1`)
- **Default**: `1`
- **Effect**: Sets emoji opacity. Values are clamped from `0` (transparent) to `1` (fully opaque).

### `background`

- **Type**: Hex color (`#RRGGBB`)
- **Default**: Not set (transparent)
- **Effect**: Fills the emoji display viewport with the supplied color. Invalid values leave the transparent background unchanged.

### Examples

```text
/admin/emojis
Standard emoji display with normal size and full opacity.

/admin/emojis?scale=2
Emojis rendered at double size.

/admin/emojis?transparency=0.5
Emojis rendered at 50% opacity.

/admin/emojis?scale=1.5&transparency=0.7
Emojis at 150% size with 70% opacity.

/admin/emojis?background=%23000000
Emojis on a black background. Encode the `#` character as `%23` in URLs.
```

## `/admin/leaderboard` Page

### `colorMode`

- **Type**: String (`light` | `dark`)
- **Default**: `light`
- **Effect**: Applies a local color theme to the leaderboard. It does not change the application's global theme.

### `core`

- **Type**: Flag (presence check)
- **Default**: Not set
- **Effect**: Uses a projector-oriented table with large rank and score text. Winner draw, score masking, and manual refresh controls remain available.

### `padding`

- **Type**: Non-negative number (pixels)
- **Default**: `0`
- **Effect**: Adds padding around the leaderboard content in core view mode.

### `scale`

- **Type**: Positive number (decimal)
- **Default**: `1`
- **Effect**: Scales leaderboard content in core view mode.

### `background`

- **Type**: Hex color (`#RRGGBB`)
- **Default**: Not set (the existing leaderboard grid background)
- **Effect**: Replaces the leaderboard page background with the supplied color. Invalid values preserve the existing background.

### `showUserId`

- **Type**: Boolean (`true` | `false`)
- **Default**: `true`
- **Effect**: Sets the initial visibility of technical participant IDs. IDs are visible by default; set to `false` for display surfaces that should show only nicknames, ranks, and scores. The leaderboard control can change this visibility after loading.

### `refresh`

- **Type**: Non-negative integer (seconds)
- **Default**: `5`
- **Effect**: Fetches only leaderboard data at the selected interval without reloading the page. Set to `0` to disable automatic refresh. Invalid or negative values use the five-second default.
- **Winner dialog**: An open draw or revealed-winner dialog is not closed or replaced by a refresh. The draw candidates and revealed winner remain fixed until the dialog is closed, even if the refreshed table no longer contains that winner.

### Examples

```text
/admin/leaderboard
Standard leaderboard with five-second data refresh and visible participant IDs.

/admin/leaderboard?core&padding=20&scale=0.9&background=%23ffffff&showUserId=false&refresh=10
Projector-oriented leaderboard with a white background, hidden technical IDs, and a ten-second data refresh interval.

/admin/leaderboard?refresh=0
Standard leaderboard with manual refresh only.

/admin/leaderboard?colorMode=dark
Standard leaderboard with its local dark color theme.
```

For `background`, encode the `#` character as `%23` in URLs.

## `/admin/presenter` Page

`/admin/presenter` runs the complete quiz sequence in one iframe. It displays the emoji stream, each enabled
question in queue order, the open and revealed states, and the existing leaderboard. The left and right arrow keys
and the visible navigation buttons follow this sequence:

```text
Question 1 open → Question 1 revealed → Question 2 open → … → Last question revealed → Leaderboard
```

Backward navigation reverses the sequence. Moving left from the first open question or right from the leaderboard
sends a boundary message to the parent presentation.

| Parameter | Type | Default | Effect |
| --- | --- | --- | --- |
| `colorMode` | `light` \| `dark` | `light` | Sets the local quiz theme and the inherited leaderboard theme. |
| `foregroundOpacity` | Number, clamped to `0`–`1` | `1` | Multiplies panel opacity without changing text or control opacity. |
| `foregroundInsetX` | Non-negative number in pixels | `56` | Sets horizontal quiz content insets. |
| `foregroundInsetY` | Non-negative number in pixels | `40` | Sets vertical quiz content insets. The fixed 18-pixel lower reserve remains. |
| `textScale` | Positive number | `1` | Scales quiz typography and presenter controls. |
| `language` | Locale string | Automatic | Selects question content language before stored and browser preferences. |
| `presenterRefresh` | Non-negative number in seconds | `2` | Refreshes presenter state at a decimal interval. Use `0` to disable periodic polling. Values between `0` and `0.1` use `0.1`. |
| `stageScale` | Positive number | `1` | Scales the complete virtual presenter stage. Values below `1` create more logical space; values above `1` enlarge the interface. |
| `emojiLayer` | `background` \| `foreground` | `background` | Places emoji below or above presentation content. Emoji layers never accept pointer input. |
| `emojiScale` | Positive number | `0.3` | Passes `scale` to the embedded `/admin/emojis` page. |
| `emojiOpacity` | Number, clamped to `0`–`1` | `0.8` | Passes `transparency` to the embedded emoji page. |
| `emojiBackground` | Hex color (`#RRGGBB`) | Transparent | Passes `background` to the embedded emoji page. |
| `leaderboardCore` | Boolean | `false` | Passes the existing `core` flag to the leaderboard when `true`. |
| `leaderboardPadding` | Non-negative number in pixels | `0` | Passes `padding` to the leaderboard. |
| `leaderboardScale` | Positive number | `1` | Passes `scale` to the leaderboard. |
| `leaderboardBackground` | Hex color (`#RRGGBB`) | Not set | Passes `background` to the leaderboard. |
| `leaderboardShowUserId` | Boolean | `true` | Passes `showUserId` to the leaderboard. |
| `leaderboardRefresh` | Non-negative integer in seconds | `5` | Passes `refresh` to the leaderboard. Use `0` to disable polling. |
| `leaderboardColorMode` | `light` \| `dark` | Inherits `colorMode` | Overrides only the embedded leaderboard theme. |

Invalid numeric values use the documented defaults. Opacity values are clamped. Repeated query values and invalid
enums or colors are rejected. `presenterRefresh` accepts decimal seconds such as `0.5`; `0` disables only periodic
polling, while initial loading, focus refreshes, and navigation still synchronize state. The `language` fallback
order is URL value, local storage, browser locale, English, then the first available question language.

`stageScale` uses the iframe dimensions automatically; no aspect-ratio parameter is required. Its logical dimensions
are `iframe width / stageScale` by `iframe height / stageScale`. The two-column quiz layout activates above 860
logical pixels. For example, a 640-pixel-wide iframe with `stageScale=0.7` has about 914 logical pixels and therefore
uses two columns. The parameter is not forwarded to the embedded emoji or leaderboard pages; `emojiScale` and
`leaderboardScale` apply in addition to it. Positive finite values are not clamped. Extremely small or large values
can make text and hit targets unreadable or increase rendering cost. Zero, negative, empty, repeated, non-finite, or
non-invertible values fall back to `1`.

### Examples

```text
/admin/presenter
Legacy-compatible light quiz layout with background emojis and the standard leaderboard.

/admin/presenter?colorMode=dark&emojiLayer=foreground&foregroundOpacity=0.85
Dark quiz layout with click-through emoji reactions above the content.

/admin/presenter?foregroundInsetX=32&foregroundInsetY=24&textScale=1.15&language=de
German question content with smaller insets and larger quiz text.

/admin/presenter?presenterRefresh=0.5
Standard quiz flow with presenter results refreshed every half-second.

/admin/presenter?stageScale=0.7
More logical space for retaining the two-column quiz layout in a small iframe.

/admin/presenter?leaderboardCore=true&leaderboardPadding=24&leaderboardScale=0.9&leaderboardShowUserId=false
Standard quiz flow with a projector-oriented leaderboard and hidden technical IDs.
```

Encode `#` as `%23` when using either background parameter.

### Authentication

The presenter page and both embedded pages use the existing admin session. Sign in to the Stage Flow Tools origin
before entering the Slidev slide. Browser privacy settings must allow that session cookie inside the iframe.

`?token=` remains an authentication bootstrap handled by the existing middleware. The middleware removes it from
the URL, and the presenter page never forwards it to the emoji or leaderboard iframe. Do not put an admin token in
a public Slidev repository, generated deck, presentation URL, log, or screenshot. Prefer an established HTTP-only
admin session.

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
