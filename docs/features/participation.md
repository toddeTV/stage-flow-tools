# Participation

## Overview

Participants join the live quiz with a nickname, answer the active question, and send emoji reactions. No account is required.

## Access and prerequisites

Open `/` in a browser with local and session storage available. An admin must publish a question and open voting before answers can be submitted.

## Capabilities and controls

- Enter a nickname to join; change it through the participant control.
- Select an answer and submit it. Submitting another selection updates the answer for the same participant and question.
- Changing the nickname attempts to retract the current question's answer and clears the visible selection and saved nickname.
- Send quick reactions or a custom valid emoji; see [Emojis](emojis.md).
- Choose the UI language through the page's language switcher.

## Parameters and configuration

The participant page has no feature-specific URL parameters. Reaction cooldown settings are documented in [Emojis](emojis.md#parameters-and-configuration). API and WebSocket base URL configuration belongs to [deployment](../deployment-docker.md) and [`.env.example`](../../.env.example).

## Behavior and limitations

The browser keeps the generated participant ID and nickname in local storage. Submitted selections are also kept per question in session storage. Clearing browser storage changes the local identity; nicknames are not account credentials.

Only one answer per participant and question is stored. Locked voting prevents submissions. A question change restores that question's saved selection; an answer reset clears its saved selection. WebSocket updates deliver question and lock changes and reconnect automatically.

Changing the nickname clears local state even if the retract request fails. It does not erase answers to other questions. Public question payloads omit admin notes, stable keys, lifecycle fields, and scoring emoji.

## Examples

Open `/`, enter a synthetic nickname, select an option on an open question, and submit. Select another option and submit again to replace the answer. Use the nickname-change control to leave the current nickname and attempt to retract the active answer.

When no question is active, the page waits for the next publication; reactions remain a separate interaction.

## Implementation and verification

- [Participant page](../../app/pages/index.vue) and [participant composable](../../app/composables/useQuizParticipant.ts) own the form and submission workflow.
- [Participant tests](../../app/composables/useQuizParticipant.test.ts) cover validation and interaction behavior.
- [Quiz socket](../../app/composables/useQuizSocket.ts) and [socket tests](../../app/composables/useQuizSocket.test.ts) cover selection restoration and realtime state.
- [Storage tests](../../server/utils/storage.test.ts) cover persisted answers.

## Related references

- [Feature Guide](README.md)
- [Questions](questions.md) and [Emojis](emojis.md)
- [Answer API](../api.md#answers), [WebSockets](../websocket.md), and [storage](../storage.md)
