# Deployment-Specific Legal Documents

Stage Flow Tools does not include legal-notice or privacy-policy text. Before
making an installation publicly available, its operator must write both
documents and insert them into the application's SQLite database.

The public routes are `/legal-notice` and `/privacy-policy`. They read these
two rows from the `legal_documents` table:

| `key` | `content` |
| --- | --- |
| `legal-notice` | Markdown body for the legal notice |
| `privacy-policy` | Markdown body for the privacy policy |

`content` is Markdown. The pages provide the fixed titles `Legal Notice
(Impressum)` and `Privacy Policy (Datenschutzerklärung)` plus their
English-only notice. Include the document's `Last updated: YYYY-MM-DD` line
and all content required for the operator's actual deployment in the Markdown
body. `updated_at` is maintained by the database whenever `content` changes.

After the first application start has created and migrated the database, add
or update these rows through the protected Drizzle Studio view at
`/admin/database`. Direct database access is an alternative when it better
fits the operator's infrastructure. The application has no legal-document
editor and no default text. A missing row leaves its public route visibly
unconfigured, so complete both rows before public operation.

Markdown supports headings, paragraphs, lists, emphasis, tables, and `https`,
`mailto`, or `tel` links. Raw HTML is not supported and is removed before the
content reaches the page.
