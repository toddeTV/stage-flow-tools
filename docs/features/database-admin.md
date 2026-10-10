# Database Admin

## Overview

The database page embeds Drizzle Studio through the application's protected server proxy so an operator can browse and edit SQLite data.

## Access and prerequisites

Use `/admin/database` with [admin access](admin-access.md). The application needs its local SQLite database and internal Studio worker.

## Capabilities and controls

- Browse database tables and edit rows through Drizzle Studio.
- Open the same protected Studio view in a separate tab.
- Insert or update the operator's [legal documents](legal-documents.md).

## Parameters and configuration

The admin page has no feature-specific URL parameters. It derives the internal frame's host and port from the current browser URL.

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| Server | `NUXT_DRIZZLE_STUDIO_INTERNAL_PORT` | Integer TCP port, `1`–`65535` | `64983` | Selects the private Studio worker port | Invalid ports return `studio.invalid_internal_port`; an unusable valid port can prevent worker startup |

See [`.env.example`](../../.env.example) and the [internal API reference](../api.md#database-admin). Studio's proxy transport is an internal interface.

## Behavior and limitations

Database editing bypasses ordinary question forms and their application-level validation. Treat changes as direct data administration; follow [storage maintenance](../storage.md#maintenance).

The application proxies Studio server-side and protects its assets and RPC transport. Keep the worker port private. Database editing does not provide the ordinary quiz actions' validation and WebSocket-broadcast contract.

## Examples

Sign in, open `/admin/database`, and browse the question table. Use Open in New Tab for a larger workspace.

For legal text setup, follow the [operator instructions](../legal-texts.md) to insert the two supported document rows.

## Implementation and verification

- [Database page](../../app/pages/admin/database.vue) constructs the protected frame.
- [Studio worker and proxy](../../server/utils/drizzle-studio.ts) and [entry route](../../server/api/admin/drizzle-studio/app/index.get.ts) own the internal service.
- [Authentication tests](../../server/utils/auth.test.ts) cover the shared access checks. There is no dedicated database-page or Studio-proxy test.

## Related references

- [Feature Guide](README.md)
- [Admin access](admin-access.md) and [Legal documents](legal-documents.md)
- [Database API](../api.md#database-admin), [storage](../storage.md), and [deployment](../deployment-docker.md)
