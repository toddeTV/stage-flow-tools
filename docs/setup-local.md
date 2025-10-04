# Local Development Setup

Complete guide for setting up the quiz application locally.

## Environment Setup

### Required Software

- **Node.js**: Version 18 or higher
- **pnpm**: Latest version
- **Git**: For version control

### Installation Steps

1. **Install pnpm** (if not installed)
   ```bash
   npm install -g pnpm
   ```

2. **Clone and install**
   ```bash
   git clone <repository-url>
   cd quiz
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

Available variables:
- `NUXT_ADMIN_USERNAME` - Admin login username (default: admin)
- `NUXT_ADMIN_PASSWORD` - Admin login password (default: 123)
- `NUXT_JWT_SECRET` - Secret for JWT tokens (generate using command above)
- `NUXT_PUBLIC_HOST` - Server host (default: 0.0.0.0)
- `NUXT_PUBLIC_PORT` - Server port (default: 3000)

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm typecheck` - Run TypeScript checks

## Data Management

### Storage Location

Data files are stored in `/data`:
- `questions.json` - Quiz questions
- `answers.json` - User answers
- `admin.json` - Admin credentials

### Reset Data

```bash
rm -rf data/
# Application recreates on next start
```

### Backup Data

```bash
cp -r data/ data-backup-$(date +%Y%m%d)
```

## Troubleshooting

### Port Already in Use

Change port in `.env`:
```
PORT=3001
```

### Permission Errors

Ensure write permissions:
```bash
chmod 755 data/
```

### WebSocket Connection Issues

- Check if port 3000 is accessible
- Verify no firewall blocking
- Check browser console for errors

## Next Steps

- [Architecture Overview](architecture.md) - System design
- [API Reference](api.md) - Endpoint documentation
