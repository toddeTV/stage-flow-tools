# URL Parameters for Frontend pages

This document describes the GET parameters available for customizing page views.

## `/results` Page

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

### `hideResults`

- **Type**: Flag (presence check)
- **Default**: Not set
- **Effect**: Hides vote counts, percentages, and question notes. Displays question marks instead of results. Useful for presentations where results should be revealed later.

### Examples

```text
/results
Standard results view with full UI.

/results?core
Core view with minimal UI, no padding, normal scale.

/results?core&padding=20&scale=0.9
Core view with 20px padding and 90% scale.

/results?core&hideResults
Core view with results hidden (shows "?" instead of numbers).

/results?core&padding=30&scale=1.2&hideResults
Core view with 30px padding, 120% scale, and hidden results.
```

## `/emojis` Page

### `scale`

- **Type**: Number (decimal)
- **Default**: `1`
- **Effect**: Scales emoji size and adjusts spawn padding to prevent emojis from appearing outside viewport.

### `transparency`

- **Type**: Number (decimal, clamped to max 1)
- **Default**: `1`
- **Effect**: Sets emoji opacity. Values are clamped to maximum 1.0 (fully opaque).

### Examples

```text
/emojis
Standard emoji display with normal size and full opacity.

/emojis?scale=2
Emojis rendered at double size.

/emojis?transparency=0.5
Emojis rendered at 50% opacity.

/emojis?scale=1.5&transparency=0.7
Emojis at 150% size with 70% opacity.
```
