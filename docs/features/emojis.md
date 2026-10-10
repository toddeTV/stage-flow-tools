# Emojis

## Overview

Participants send emoji reactions from the quiz page. The protected overlay animates incoming reactions for a presentation.

## Access and prerequisites

Submit reactions on `/` after joining; see [Participation](participation.md). Open `/admin/emojis` with [admin access](admin-access.md). Overlay delivery requires its WebSocket connection.

## Capabilities and controls

- Submit quick reactions or a custom valid emoji.
- Adjust overlay size, opacity, and background.
- Layer the overlay inside the [Presenter](presenter.md), or disable that layer with `emojiLayer=none`.

## Parameters and configuration

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| Overlay URL | `scale` | Positive finite number | `1` | Scales emojis and adjusts spawn padding | Empty, non-positive, non-finite, or repeated values use `1` |
| Overlay URL | `transparency` | Finite number, clamped to `0`–`1` | `1` | Sets opacity; `0` is transparent | Finite values clamp; empty, non-finite, or repeated values use `1` |
| Overlay URL | `background` | Hex color `#RRGGBB` | Transparent | Fills the viewport background | Invalid or repeated values preserve transparency |
| Reaction runtime | `NUXT_PUBLIC_EMOJI_COOLDOWN_MS` | Number, milliseconds | `1500` | Sets per-participant submission cooldown | No dedicated startup validator; configure a positive finite duration |
| Batch runtime | `NUXT_EMOJI_BATCH_TICK_MS` | Positive safe integer, milliseconds | `150` | Sets the batch flush delay | Server startup rejects invalid configuration |
| Batch runtime | `NUXT_EMOJI_BATCH_MAX_SIZE` | Positive safe integer | `1200` | Limits reactions per WebSocket batch | Server startup rejects invalid configuration |
| Batch runtime | `NUXT_EMOJI_QUEUE_MAX_SIZE` | Positive safe integer | `25000` | Limits queued reactions | Server startup rejects invalid configuration |

See [`.env.example`](../../.env.example) for the configuration contract. Encode `#` as `%23` in background URLs. The overlay does not use `core`, `padding`, `refresh`, or `colorMode`.

## Behavior and limitations

The browser shows a cooldown countdown; the server also enforces the cooldown by participant ID. Invalid emoji input is rejected. Reactions are transient, batched, and held in process memory. A full queue silently discards new reactions.

The overlay reconnects its emoji WebSocket automatically. Individual rendered emojis do not accept pointer input. The Presenter makes its complete emoji layer click-through.

## Examples

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

## Implementation and verification

- [Emoji page](../../app/pages/admin/emojis.vue), [participant composable](../../app/composables/useQuizParticipant.ts), and [batch decoder](../../app/utils/emoji-batch.ts) own submission and rendering.
- [Page tests](../../app/pages/admin/emojis.test.ts) and [batch tests](../../app/utils/emoji-batch.test.ts) verify display and incoming payloads.
- [Submission tests](../../server/api/emojis/submit.post.test.ts) and [batch-config tests](../../server/utils/emoji-batching-config.test.ts) cover validation and runtime limits.

## Related references

- [Feature Guide](README.md)
- [Participation](participation.md) and [Presenter](presenter.md)
- [Emoji API](../api.md#emojis), [WebSockets](../websocket.md), and [deployment](../deployment-docker.md)
