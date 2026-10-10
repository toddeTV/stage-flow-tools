# Legal Documents

## Overview

The public legal-notice and privacy-policy pages display the operator's deployment-specific Markdown documents.

## Access and prerequisites

`/legal-notice` and `/privacy-policy` are public. An operator must configure both stored documents before public operation. Use [Database admin](database-admin.md) or direct database access following the [operator guide](../legal-texts.md).

## Capabilities and controls

- Read the legal notice or privacy policy without signing in.
- Render stored Markdown with sanitized links and formatting.
- Show an unconfigured notice when a required document is missing.

There is no legal-document editor on these pages and no public write endpoint.

## Parameters and configuration

These pages have no feature-specific URL parameters or server settings. The supported document keys, Markdown content, timestamps, and setup procedure are defined in the [operator guide](../legal-texts.md).

## Behavior and limitations

The repository provides no default legal text. Fixed page titles and the unconfigured notice use English. Raw HTML is removed from stored Markdown, and rendered content is sanitized.

Each route requests only its corresponding supported key. Operator text and its effective date are deployment data, not source-controlled application content.

## Examples

After configuring the two rows using the operator guide, open `/legal-notice` and `/privacy-policy` without an admin session to inspect their public content.

Check a fresh installation before public operation: each missing row should show the unconfigured state, which tells the operator that setup is still required.

## Implementation and verification

- [Legal notice page](../../app/pages/legal-notice.vue), [privacy page](../../app/pages/privacy-policy.vue), and [legal API](../../server/api/legal/[key].get.ts) own public reads.
- [Page tests](../../app/pages/legal-pages.test.ts) and [route tests](../../server/api/legal/legal-route.test.ts) cover missing documents and supported keys.
- [Markdown tests](../../app/utils/render-legal-markdown.test.ts) and [storage tests](../../server/utils/legal-documents.test.ts) verify sanitization and persistence.

## Related references

- [Feature Guide](README.md)
- [Database admin](database-admin.md)
- [Operator guide](../legal-texts.md), [legal API](../api.md#legal-documents), and [storage](../storage.md)
