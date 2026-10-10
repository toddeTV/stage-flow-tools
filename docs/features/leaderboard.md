# Leaderboard

## Overview

The leaderboard ranks participants by correct answers to previously published questions and provides a winner draw among participants sharing the top rank.

## Access and prerequisites

Use `/admin/leaderboard` with [admin access](admin-access.md). At least one published question needs an option marked `⭐` for scored entries to appear.

## Capabilities and controls

- Display ranks, nicknames, correct-answer counts, and optional technical IDs.
- Refresh manually or automatically without reloading the page.
- Mask scores with the presentation control.
- Open the winner dialog, draw from the top-ranked candidates, and reveal the winner.
- Use a projector-oriented core layout while retaining the controls.

## Parameters and configuration

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| URL | `colorMode` | `light` / `dark` | `light` | Sets this page's local theme | Anything except a single `dark` value uses `light` |
| URL | `core` | Presence flag | Absent | Uses the projector table with large rank and score text | Any present value enables it |
| URL; core only | `padding` | Non-negative number, pixels | `0` | Adds content padding | Empty, negative, non-finite, or repeated values use `0` |
| URL; core only | `scale` | Positive finite number | `1` | Scales content | Empty, non-positive, non-finite, or repeated values use `1` |
| URL | `background` | Hex color `#RRGGBB` | Existing grid background | Replaces page background | Invalid or repeated values preserve the background |
| URL | `showUserId` | `true` / `false` | `true` | Sets initial technical-ID visibility; a control can change it | Anything except a single `false` value shows IDs |
| URL | `refresh` | Non-negative integer, seconds | `5` | Polls leaderboard data; `0` disables periodic refresh | Empty, negative, fractional, non-finite, or repeated values use `5` |

Encode `#` as `%23` in background URLs.

## Behavior and limitations

Only published questions with a correct option contribute scores. Correctness matches English option labels case-insensitively. Participants answering those questions can appear with zero correct answers. Equal scores share a rank; ranks increase by one per distinct score.

Refresh preserves an open winner dialog. Its candidates and revealed winner remain fixed until closing, even if subsequent data changes. After a successful load, a failed refresh keeps the last usable table. Hiding IDs affects rendering; the authenticated response still includes them.

## Examples

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

## Implementation and verification

- [Leaderboard page](../../app/pages/admin/leaderboard.vue) and [winner dialog](../../app/components/admin/AdminLeaderboardWinnerDialog.vue) own presentation and the draw.
- [Leaderboard calculation](../../server/utils/leaderboard.ts) and [calculation tests](../../server/utils/leaderboard.test.ts) verify scoring and ranks.
- [Page tests](../../app/pages/admin/leaderboard.test.ts) verify display parameters, refresh, and winner-dialog stability.

## Related references

- [Feature Guide](README.md)
- [Questions](questions.md), [Presenter](presenter.md), and [Recap](recap.md)
- [Leaderboard API](../api.md#get-apiresultsleaderboard) and [storage](../storage.md)
