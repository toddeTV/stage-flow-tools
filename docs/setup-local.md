# Local Development Setup

Complete guide for setting up the quiz application locally.

## Environment Setup

### Required Software

- **Node.js**: Version 24.x
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
   vp install
   ```

## Configuration

### Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

**Generate a strong JWT secret:**

```bash
openssl rand -base64 48
```

Copy the generated secret and update `NUXT_JWT_SECRET` in your `.env` file.

## Data Management

### Storage Location

During local development, data is stored in `.data/db/stage-flow-tools.sqlite3` (created automatically, gitignored):

- `questions` and `answers` are stored in SQLite tables.
- Admin credentials stay in runtime config.

No bundled question set is shipped with the repository. Create questions through the admin UI.

### Reset Data

```bash
rm -rf .data/
# Restart the app to recreate the quiz database
```

### Backup Data

```bash
cp -r .data/ data-backup-$(date +%Y%m%d)
```

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

## Next Steps

- [Architecture Overview](architecture.md) - System design
- [API Reference](api.md) - Endpoint documentation
