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
```

For `background`, encode the `#` character as `%23` in URLs.
