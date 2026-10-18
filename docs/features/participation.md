# Participation

## Overview

Participants join the live quiz with a nickname, answer the active question, and send emoji reactions. No account is required.

## Access and prerequisites

Open `/` in a browser with local and session storage available. An admin must publish a question and open voting before answers can be submitted.

## Capabilities and controls

- Enter a nickname to join; change it through the participant control.
- Select an answer and submit it. Submitting another selection updates the answer for the same participant and question.
- Selection and confirmation appear immediately. If submission fails, the confirmation is replaced by an inline error and a **Try again** action; the selected option remains available.
- Changing the nickname attempts to retract the current question's answer and clears the visible selection and saved nickname.
- Send quick reactions or a custom valid emoji; see [Emojis](emojis.md).
- Choose the question and UI language through the page's language switcher; see [Languages](languages.md).

## Parameters and configuration

Use `language` to select a language from the shared question pool; see [Languages](languages.md#parameters-and-configuration). Reaction cooldown settings are documented in [Emojis](emojis.md#parameters-and-configuration). API and WebSocket base URL configuration belongs to [deployment](../deployment-docker.md) and [`.env.example`](../../.env.example).

## Behavior and limitations

The browser keeps the generated participant ID and nickname in local storage. Submitted selections are also kept per question in session storage. Clearing browser storage changes the local identity; nicknames are not account credentials.

Only one answer per participant and question is stored. Locked voting prevents submissions. A question change restores that question's saved selection; an answer reset clears its saved selection. WebSocket updates deliver question and lock changes and reconnect automatically.

On connection and reconnection, the browser reloads the current question and lock
state. Refreshing the same question preserves the draft and confirmed answer;
missed unpublication clears the question. Snapshot retries and ordering are
documented in [WebSockets](../websocket.md#client-connection).

Answers remain editable during submission. Requests run one at a time per question;
rapid changes keep only the latest waiting selection. A question change discards
unsent selections for the previous question. Each request carries its question ID,
so delayed submissions cannot count toward a different question.

Only server-confirmed answers are saved in session storage. When voting locks,
the recorded-answer display shows the last confirmed choice. A pending or failed
change is marked as unconfirmed. Failed requests are not retried automatically;
**Try again** is available while voting is open.

Changing the nickname clears local state even if the retract request fails. It does not erase answers to other questions. Public question payloads omit admin notes, stable keys, lifecycle fields, and scoring emoji.

Rejoining and selecting an answer remain available during nickname changes. New
submissions for that question wait until its pending retractions finish, so an
older retraction cannot delete a newly confirmed answer.

## Examples

Open `/`, enter a synthetic nickname, select an option on an open question, and submit. Select another option and submit again to replace the answer. Use the nickname-change control to leave the current nickname and attempt to retract the active answer.

When no question is active, the page waits for the next publication; reactions remain a separate interaction.

## Implementation and verification

- [Participant page](../../app/pages/index.vue) and [participant composable](../../app/composables/useQuizParticipant.ts) own the form and submission workflow.
- [Participant tests](../../app/composables/useQuizParticipant.test.ts), [answer submission tests](../../app/composables/useQuizAnswers.test.ts), and [rendered page tests](../../app/pages/index.test.ts) cover identity, serialized optimistic submissions, and failure recovery.
- [Quiz socket](../../app/composables/useQuizSocket.ts) and [socket tests](../../app/composables/useQuizSocket.test.ts) cover selection restoration and realtime state.
- [Storage tests](../../server/utils/storage.test.ts) cover persisted answers.
- [Answer API integration tests](../../test/answers-submit.integration.test.ts) verify question identity, validation, and rejected writes using SQLite.
- [Nickname-change integration tests](../../test/participant-answer-ordering.integration.test.ts) verify that delayed retractions finish before replacement answers are stored.

## Related references

- [Feature Guide](README.md)
- [Questions](questions.md) and [Emojis](emojis.md)
- [Answer API](../api.md#answers), [WebSockets](../websocket.md), and [storage](../storage.md)
