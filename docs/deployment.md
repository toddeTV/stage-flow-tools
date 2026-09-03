# Deployment

This project has one supported production deployment path: Docker.

## Recommended Deployment

Use Docker Compose on a Linux host with a reverse proxy such as Traefik.

- [Docker Deployment Guide](deployment-docker.md)
- [Production Deployment](setup-production.md)
- [Deployment-Specific Legal Documents](legal-texts.md)
- [Release Flow](release-flow.md)

## Runtime Notes

- Application data is stored in SQLite at `.data/db/stage-flow-tools.sqlite3`.
- WebSocket state stays in process memory.
- Production deployments need a persistent mount for `/app/.data`.
- Operators must add their own legal documents to the migrated database before public operation.

## Secondary Runtime

If your environment cannot run Docker, you can run the built Node.js server directly on self-hosted infrastructure. This path is a fallback runtime, not the main deployment guide.
