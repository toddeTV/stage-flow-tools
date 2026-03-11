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

### `visibility`

- **Type**: String (`hide-all` | `show-all`)
- **Default**: `hide-all`
- **Effect**: Controls how results behave when a new question is published.
  - `hide-all` - Results are hidden whenever a new question appears. The admin can reveal them manually.
  - `show-all` - Results are shown immediately when a new question appears.

### `hideResults` (deprecated)

- **Type**: Flag (presence check)
- **Default**: Not set
- **Effect**: Legacy parameter. Mapped to `visibility=hide-all` for backward compatibility. Prefer using `visibility` instead.

### Examples

```text
/results
Standard results view. Results hidden on new questions (default: hide-all).

/results?core
Core view with minimal UI, no padding, normal scale.

/results?core&padding=20&scale=0.9
Core view with 20px padding and 90% scale.

/results?core&visibility=hide-all
Core view with results hidden on each new question.

/results?core&visibility=show-all
Core view with results shown immediately on each new question.

/results?core&padding=30&scale=1.2&visibility=hide-all
Core view with 30px padding, 120% scale, and hidden results.

/results?core&hideResults
Legacy: equivalent to visibility=hide-all.
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
