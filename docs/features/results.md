# Results

## Overview

The results page shows votes for the active question and provides admin controls for revealing results and running the quiz.

## Access and prerequisites

Use `/admin/results` with [admin access](admin-access.md). For a display that cannot change quiz state, use [Presenter display mode](presenter.md#scoped-controller-and-display-modes).

## Capabilities and controls

- Display option counts, percentages, total responses, and connected participant totals.
- Hide counts and bars, scramble option labels, or show option emoji.
- Refresh results manually; lock or unlock voting, reset answers after confirmation, unpublish, or publish the next question.
- Pick a random participant who answered a selected option. The server sends the selected connected participant a winner notification.

## Parameters and configuration

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| URL | `core` | Presence flag | Absent | Removes page title, back link, and normal padding; uses bare section styling | Any present value enables it, including `false` |
| URL; core only | `padding` | Non-negative number, pixels | `0` | Adds content padding | Empty, negative, non-finite, or repeated values use `0` |
| URL; core only | `scale` | Positive finite number | `1` | Scales content | Empty, non-positive, non-finite, or repeated values use `1` |
| URL | `visibility` | `hide` / `show` | `hide` | Sets initial visibility and visibility on question changes | Empty uses `hide`; other strings are not strictly validated; use the supported values |
| URL | `scramble` | `hide` / `show` | `show` | `hide` masks option labels and shuffles their order on question changes | Empty uses `show`; other strings are not strictly validated; use the supported values |

`visibility` and `scramble` are read at initialization. Repeated values are unsupported by those controls. For non-empty strings, initial masking uses a `hide` prefix; automatic resets on subsequent questions require the exact `hide` or `show` value.

## Behavior and limitations

Results load over HTTP and update through the protected results WebSocket channel. This page does not consume `refresh`, `colorMode`, or `background`, even though the shared display parser understands them.

Hiding results masks counts and bars. Scrambling masks option text and shuffles option order while leaving visible counts and bars available. Option emoji have an independent visibility control, initially off. When both hiding and scrambling are active, both sets of masking apply. The note appears only when neither hiding nor scrambling is active.

New questions reset option emoji visibility. Manual display controls do not alter submitted answers or lock voting. Resetting answers deletes the active question's answers; unpublishing retains them. Random-winner delivery fails if the selected participant is no longer connected.

## Examples

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

## Implementation and verification

- [Results page](../../app/pages/admin/results.vue) and [results composable](../../app/composables/useAdminResults.ts) own display controls and admin actions.
- [Display parser tests](../../app/composables/useDisplayParameters.test.ts) verify numeric defaults and core parameters.
- [Socket tests](../../app/composables/useQuizSocket.test.ts) and [result-update tests](../../server/utils/results-update.test.ts) cover realtime updates.
- [Winner route](../../server/api/results/pick-random-user.post.ts) enforces connected-participant delivery.

## Related references

- [Feature Guide](README.md)
- [Questions](questions.md) and [Presenter](presenter.md)
- [Results API](../api.md#results), [answer reset](../api.md#post-apianswersreset), and [WebSockets](../websocket.md)
