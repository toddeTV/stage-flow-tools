# Feature Name

Copy this template for a feature page and replace the instructional paragraphs with verified product facts. Keep all eight section headings in this order. If a feature has no parameters or no dedicated test, state that briefly instead of inventing one.

## Overview

Describe what the feature does and when a participant, presenter, or operator uses it.

## Access and prerequisites

List product routes, required access, and prerequisites. Link shared authentication requirements to `admin-access.md`.

## Capabilities and controls

Describe supported actions and their effects. Distinguish display controls from actions that change shared quiz state.

## Parameters and configuration

List only parameters the feature actually consumes. Separate modes or server settings with the Scope / mode column. Link API request fields to the API reference rather than duplicating payload schemas.

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| URL or server; applicable mode | `parameter` | Verified type, range, or enum | Verified default | Observable behavior | Actual fallback, clamp, or rejection |

State units, presence flags, repeated-value handling, and mode restrictions where applicable. Link server configuration to `.env.example`.

## Behavior and limitations

Explain relevant state transitions, data retention or deletion, updates, failures, and operational limits.

## Examples

Provide a minimal usable example and variants for the feature's supported modes. Use synthetic content, example origins, and no credentials. Refer to shared login and setup instructions.

## Implementation and verification

Link the central consuming implementation and existing tests with a short description of what they verify. Label uncovered behavior honestly.

## Related references

Link the feature index, related features, and owning API, WebSocket, storage, or deployment sections.
