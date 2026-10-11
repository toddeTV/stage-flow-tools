# Feature Guide

Use this index to find a product capability, its controls, parameters, limitations, examples, and implementation references. Every feature follows the same [template](_template.md).

| Feature | Purpose | Routes | Access | Guide |
| --- | --- | --- | --- | --- |
| Participation | Join, answer questions, and send reactions | `/` | Public; nickname for participation | [Participation](participation.md) |
| Questions | Manage and reset the quiz; import or export question packages | `/admin/questions` | Admin | [Questions](questions.md) |
| Presenter | Run a selectable quiz sequence, live status, or read-only preview | `/admin/presenter` | Admin | [Presenter](presenter.md) |
| Results | Display live voting results and control the active question | `/admin/results` | Admin | [Results](results.md) |
| Leaderboard | Display scores and draw a winner from the top rank | `/admin/leaderboard` | Admin | [Leaderboard](leaderboard.md) |
| Recap | Display aggregate quiz totals and highlights | `/admin/recap` | Admin | [Recap](recap.md) |
| Emojis | Send reactions and display the animated overlay | `/`, `/admin/emojis` | Public submission; admin overlay | [Emojis](emojis.md) |
| Admin access | Sign in, select an admin page, or authenticate external software | `/login`, `/admin` | Public login; admin dashboard | [Admin access](admin-access.md) |
| Database admin | Browse and edit SQLite through Drizzle Studio | `/admin/database` | Admin | [Database admin](database-admin.md) |
| Legal documents | Display the operator's legal notice and privacy policy | `/legal-notice`, `/privacy-policy` | Public reads; admin database setup | [Legal documents](legal-documents.md) |

## Reference ownership

Feature pages own user workflows, URL parameters, and product behavior. The [API reference](../api.md) owns HTTP contracts; the [WebSocket reference](../websocket.md) owns realtime contracts. [Storage](../storage.md) and [deployment](../deployment-docker.md) describe persistence and operation. [`.env.example`](../../.env.example) defines runtime configuration.

## Maintaining this guide

Add an index entry and a page based on the [template](_template.md) when adding a product feature. Update the affected page and technical references in the same change when behavior or parameters change. Verify claims against the consuming code and existing tests; a shared parser may expose options that a particular page does not use.

Keep detailed contracts in their owning reference and link to them. Preserve existing documentation anchors when moving content. Keep examples synthetic and free of credentials or real participant data.
