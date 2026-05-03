# Docker Deployment Guide

Deploy the application on your own Linux server using Docker Compose and a Traefik reverse proxy. This is the supported production path for the project.

## Why Docker?

- **Full control** - your server, your data, your rules.
- **Works everywhere** - any Linux server with Docker installed.
- **Data persistence** - quiz data stored on disk through a persistent volume mount.
- **Corporate-friendly** - runs behind firewalls and VPNs without external dependencies.
- **Ready to use** - the current codebase runs natively on Node.js, no migration needed.

## Prerequisites

- A Linux server with [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.
- A [Traefik](https://doc.traefik.io/traefik/) reverse proxy instance running and configured on the same server. Traefik handles SSL certificate provisioning via Let's Encrypt and routes HTTPS traffic to the application container.
- The `traefik-public` Docker network must exist. Create it if needed: `docker network create traefik-public`.
- A domain or subdomain pointed to the server's IP address (A or AAAA DNS record).

## Setup

### 1. Clone the Repository

Connect to your server and clone the repository:

```bash
git clone <repository-url>
cd stage-flow-tools
```

### 2. Configure Environment

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit the `.env` file and set a strong, unique `NUXT_JWT_SECRET`. You can generate one with:

```bash
openssl rand -base64 48
```

Set a strong admin password as well:

```bash
# In .env:
NUXT_ADMIN_USERNAME=admin
NUXT_ADMIN_PASSWORD=<your-strong-password>
NUXT_JWT_SECRET=<paste-output-from-openssl>
```

### 3. Configure Docker Compose

Open the `docker-compose.yml` file and update the Traefik `Host` rule to match your domain:

```yaml
services:
  app:
    # ...
    labels:
      - "traefik.http.routers.quiz-app.rule=Host(`quiz.your-domain.com`)" # Change this
      # ...
```

### 4. Build and Start the Container

Build the Docker image and start the container in detached mode:

```bash
docker compose up --build -d
```

The application will be accessible at your configured domain. Traefik will automatically handle SSL certificate provisioning via Let's Encrypt.

## Data Persistence

The `docker-compose.yml` mounts one directory:

- `./.data` -> `/app/.data` - SQLite database storage for quiz questions and answers.

Without the `.data` mount, all runtime data is lost when the container is removed or recreated.

## Maintenance

### Updating the Application

To update the application to the latest version:

```bash
git pull
docker compose up --build -d
```

### Viewing Logs

To view the application logs:

```bash
docker compose logs -f
```

### Stopping the Application

To stop the application:

```bash
docker compose down
```

## How It Works

### Why Traefik?

Traefik acts as a reverse proxy that sits in front of the application container. It provides:

- **Automatic SSL** - provisions and renews Let's Encrypt certificates without manual setup.
- **HTTP to HTTPS redirect** - forces all traffic through encrypted connections.
- **WebSocket proxying** - transparently proxies WebSocket connections (`/_ws`) alongside regular HTTP traffic.
- **Docker-native** - discovers containers via Docker labels, no manual config files for each service.

The `docker-compose.yml` labels configure Traefik routing:

- `traefik.http.routers.stage-flow-tools.rule=Host(...)` - routes traffic for your domain to this container.
- `traefik.http.routers.stage-flow-tools.entrypoints=websecure` - listens on the HTTPS entrypoint.
- `traefik.http.routers.stage-flow-tools.tls.certresolver=myresolver` - uses Let's Encrypt for SSL.
- `traefik.http.services.stage-flow-tools.loadbalancer.server.port=3000` - forwards traffic to port 3000 inside the container.

### Data persistence

The `docker-compose.yml` file mounts `./.data:/app/.data`. All application data is stored under `/app/.data` inside the container. This means:

- Data survives container restarts, rebuilds, and updates.
- You can back up data by copying the `./.data` directory.
- You can inspect the SQLite database file directly on the host.

### Security considerations

- Always set a strong `NUXT_JWT_SECRET` (at least 48 bytes of randomness).
- Change the default admin password before making the application publicly accessible.
- The `NUXT_JWT_SECRET` is the only secret passed via environment variable in `docker-compose.yml`. Admin credentials can be set in `.env` and are read by the container at startup.
- Traefik handles SSL termination. Internal traffic between Traefik and the container is unencrypted (port 3000) but stays within the Docker network.

## Using a Pre-Built Image

Instead of building locally, you can use the pre-built Docker image from the GitHub Container Registry:

```yaml
services:
  app:
    image: ghcr.io/toddetv/stage-flow-tools:latest
    # ... rest of config same as above
```

Replace `:latest` with a specific version tag (e.g., `:1.0.0`) for reproducible deployments. Available tags are published automatically on each release.
