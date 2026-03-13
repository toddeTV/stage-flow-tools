# Local Development Setup

Complete guide for setting up the quiz application locally.

## Environment Setup

### Required Software

- **Node.js**: Version 24.x
- **pnpm**: Version 10.x
- **Git**: For version control

### Installation Steps

1. **Install pnpm** (if not installed)

   ```bash
   npm install -g pnpm
   ```

2. **Clone and install**
   ```bash
   git clone <repository-url>
   cd stage-flow-tools
   pnpm install
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

## Development Commands

- `pnpm dev` - Start development server (uses filesystem storage via `devStorage`)
- `pnpm run build:cloudflare` - Build for Cloudflare Workers
- `pnpm preview` - Preview production build
- `pnpm test` - Run all checks (lint + types)
- `pnpm run test:lint` - Lint and format check via ESLint
- `pnpm run test:types` - Run TypeScript checks
- `pnpm run fix:lint` - Auto-fix lint and format issues

## Data Management

### Storage Location

During local development (`pnpm dev`), data is stored in `.data/db/` (created automatically, gitignored) via the `devStorage` filesystem driver:

- `questions` - Quiz questions
- `answers` - User answers
- `admin` - Admin credentials

Predefined questions can be loaded from `data/predefined-questions.json` (see [predefined-questions.md](predefined-questions.md)).

> In production, data is stored in Cloudflare KV. The filesystem driver is only used during local development.

### Reset Data

```bash
rm -rf .data/db/
# Application recreates defaults on next start
```

### Backup Data

```bash
cp -r .data/db/ data-backup-$(date +%Y%m%d)
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
- [Cloudflare Deployment](deployment-cloudflare.md) - Deploy to production
