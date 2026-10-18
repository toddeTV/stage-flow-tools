# Local Development Setup

Complete guide for setting up the quiz application locally.

## Environment Setup

### Required Software

- **Node.js**: Version 26.x
- **Vite+ (`vp`)**: Installed and available in your shell
- **Git**: For version control

### Installation Steps

1. **Install Vite+** (if not installed)

   ```bash
   curl -fsSL https://vite.plus | bash
   ```

2. **Clone and install**
   ```bash
   git clone <repository-url>
   cd stage-flow-tools
   vp run install:clean
   ```

## Configuration

### Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Set a private admin password and a separate JWT secret in your `.env` file.
Generate the password with:

```bash
openssl rand -hex 32
```

Use the output for `NUXT_ADMIN_PASSWORD`. Generate the JWT secret separately:

```bash
openssl rand -base64 48
```

Use the output for `NUXT_JWT_SECRET`. Both settings are required in development
and production. Empty values and the previous published defaults prevent server
startup. Errors name the setting to fix without displaying its value.

## Data Management

### Storage Location

During local development, data is stored in `.data/db/stage-flow-tools.sqlite3` (created automatically, gitignored):

- `questions` and `answers` are stored in SQLite tables.
- Admin credentials stay in runtime config.

Two development-only example questions are included. Seed a fresh local database with:

```bash
vp run ops:seed:dev
```

The command applies local migrations and refuses to overwrite existing questions or answers. You can also create questions through the admin UI.

### Reset Data

Use the [reset and deletion comparison](storage.md#reset-and-deletion) to choose the
operation. **Reset Quiz** retains questions and legal documents. Removing `.data`
also deletes legal documents and requires stopping all database connections and
making a backup first.

### Backup Data

Follow the [storage backup](storage.md#backup) and [restore](storage.md#restore)
instructions. Stop the development server and any standalone database tools before
copying the complete `.data` directory.

## Troubleshooting

### Port Already in Use

Change port in `.env`:

```
PORT=3001
```

### Permission Errors

Check write permissions on the `.data/` directory:

```bash
chmod 755 .data/
```

### WebSocket Connection Issues

- Check if port 3000 is accessible
- Verify no firewall blocking
- Check browser console for errors

## Development Checks

After installing dependencies, run the complete validation sequence from the
repository root:

```sh
vp run test
```

The scripts in [`package.json`](../package.json) run these checks in order and stop
on the first failure. Run a single script when investigating a failure:

| Command | Check |
| --- | --- |
| `vp run test:lint-format` | ESLint code and formatting rules |
| `vp run test:package-json` | Package metadata formatting |
| `vp run test:notices` | Generated third-party notices match dependencies |
| `vp run test:markdown-structure` | Markdown changes preserve existing section boundaries |
| `vp run test:type` | Nuxt and TypeScript type checks |
| `vp run test:unit` | Source-adjacent tests and `test/unit/` |
| `vp run test:integration` | Integration tests under `test/` |

The [validation workflow](../.github/workflows/validation-and-tests.yml) runs the
same checks as separate CI jobs. A local pass does not replace reviewing CI results.
For building and running the container locally, see [Local Docker Testing](local-testing.md).

## Next Steps

- [Architecture Overview](architecture.md) - System design
- [API Reference](api.md) - Endpoint documentation
