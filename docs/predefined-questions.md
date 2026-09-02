# Predefined Questions

The repository includes two development-only example questions. They demonstrate
complete English, German, and Japanese question, answer-option, and note content.

Seed a fresh local database with:

```bash
vp run ops:seed:dev
```

The command applies pending local migrations. It refuses to run when questions or
answers already exist, so it never overwrites quiz data. Create a fresh local
database before retrying.

## Operational Notes

- Persist `.data/` in Docker or direct Node.js deployments so the SQLite file survives restarts.
- The example questions remain unpublished drafts for admin-controlled testing.
- The repository does not include production question content.
