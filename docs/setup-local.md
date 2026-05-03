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

## Development Commands

- `vp run dev` - Start development server
- `vp run build:ssr` - Build for production (server-rendered)
- `vp run build:ssg` - Static site generation build
- `vp run preview` - Preview production build
- `vp run test` - Run all checks (lint + types)
- `vp run test:lint-format` - Lint and format check via ESLint
- `vp run test:types` - Run TypeScript checks
- `vp run fix:lint` - Auto-fix lint and format issues

## Data Management

### Storage Location

During local development, data is stored in `.data/db/` (created automatically, gitignored):

- `questions` - Quiz questions
- `answers` - User answers
- `admin` - Admin credentials

Predefined questions can be loaded from `data/predefined-questions.json` (see [predefined-questions.md](predefined-questions.md)).

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
