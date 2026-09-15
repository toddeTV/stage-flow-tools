# Docker Deployment Guide

Deploy Stage Flow Tools on a Linux server with Docker Compose and a Traefik
reverse proxy. Docker is the supported production runtime.

Stage Flow Tools deliberately does not include a ready-to-run Compose file.
The hostname, network name, certificate resolver, filesystem paths, and
secrets belong to the operator's infrastructure. Create and maintain those
files outside the repository.

## Prerequisites

- Docker Engine and the Docker Compose plugin on the server.
- A Traefik instance that can reach the application through a shared external
  Docker network.
- A domain or subdomain directed to the server.
- A persistent host directory for the application `.data` directory.
- A `nofile` limit of at least `65536` for the host, Traefik, and application
  container when serving large audiences.

If Cloudflare proxies the hostname, complete the proxy setup in
[Optional Cloudflare Proxy/CDN](deployment-cloudflare-proxy.md) before opening
the application to participants.

## Setup

### 2. Configure Environment

Create a private `.env` file next to the deployment-specific Compose file.
Use [`.env.example`](../.env.example) as the list of supported application
settings. Set a unique production password and JWT secret before starting the
container:

```bash
openssl rand -base64 48
```

```dotenv
NUXT_ADMIN_USERNAME=admin
NUXT_ADMIN_PASSWORD=<strong-unique-password>
NUXT_ADMIN_TOKEN=<optional-static-admin-token>
NUXT_JWT_SECRET=<output-from-openssl>
```

`NUXT_ADMIN_TOKEN` is optional. Leave it empty unless external software needs
bearer-token API access or a tokenized `/admin` page URL.

For separately hosted browser clients such as a local Slidev presentation,
enable CORS only for exact origins:

```dotenv
NUXT_API_CORS_ENABLED=true
NUXT_API_CORS_ALLOWED_ORIGINS=http://localhost:3030
```

Do not use wildcard origins, paths, query parameters, fragments, or
credentials in this value. CORS covers `/api/*` only and does not enable
cross-origin cookies.

### 3. Configure Docker Compose

Create a Compose file in the server project directory. The following is an
annotated example, not a file to copy unchanged. Replace every value in angle
brackets with values from the target server and reverse proxy. Choose one
image reference: a released GHCR image for an ordinary deployment, or
`stage-flow-tools:latest` when the maintainer workflow loads images directly
onto the server.

```yaml
services:
  app:
    image: <image-reference>
    container_name: <container-name>
    restart: unless-stopped
    env_file:
      - .env
    environment:
      NUXT_API_CORS_ALLOWED_ORIGINS: "${NUXT_API_CORS_ALLOWED_ORIGINS:-}"
      NUXT_API_CORS_ENABLED: "${NUXT_API_CORS_ENABLED:-false}"
    # Keep a production guard when using the repository default values in .env.example.
    command:
      - /bin/sh
      - -ec
      - |
        if [ -z "$$NUXT_ADMIN_PASSWORD" ] || [ "$$NUXT_ADMIN_PASSWORD" = "123" ]; then
          echo "NUXT_ADMIN_PASSWORD must be set to a non-default production value." >&2
          exit 1
        fi
        if [ -z "$$NUXT_JWT_SECRET" ] || [ "$$NUXT_JWT_SECRET" = "tryUJ0zQbstPbTOrezme+Fv+KndzDNRx5lmSeelr2ial2/2yV8HqLeQ2felJafqf" ]; then
          echo "NUXT_JWT_SECRET must be set to a non-default production value." >&2
          exit 1
        fi
        exec node .output/server/index.mjs
    volumes:
      - <persistent-data-path>:/app/.data
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    networks:
      - proxy
    labels:
      traefik.enable: "true"
      traefik.docker.network: <traefik-network>
      traefik.http.routers.stage-flow-tools.rule: "Host(`<public-hostname>`)"
      traefik.http.routers.stage-flow-tools.entrypoints: <https-entrypoint>
      traefik.http.routers.stage-flow-tools.tls: "true"
      traefik.http.routers.stage-flow-tools.tls.certresolver: <certificate-resolver>
      traefik.http.services.stage-flow-tools.loadbalancer.server.port: "3000"

networks:
  proxy:
    external: true
    name: <traefik-network>
```

The `image` value selects the deployed application version. Use a specific
release tag such as `ghcr.io/toddetv/stage-flow-tools:1.0.0` for reproducible
ordinary deployments. The persistent mount stores SQLite data at
`/app/.data`; removing it loses quiz data when a container is recreated.

The Traefik router forwards HTTPS and WebSocket traffic to port `3000` inside
the container. Select the resolver configured by the server operator. For
example, a direct Let’s Encrypt setup and a Cloudflare DNS challenge normally
use different resolver names.

Validate the final private file before starting it:

```bash
docker compose --file <compose-file> config --quiet
docker compose --file <compose-file> up --detach
```

After the first start, add the deployment's own `legal-notice` and
`privacy-policy` rows through `/admin/database`. See
[Deployment-Specific Legal Documents](legal-texts.md) for the required keys
and Markdown format.

## Maintainer Deployments from GitHub Actions

The manually triggered `Deploy selected ref to maintainer server` workflow
accepts a branch, tag, or commit SHA through its `source_ref` input. It defaults
to `main`, builds and smoke-tests the selected revision, then transfers only a
compressed Docker image archive over SSH. It does not copy repository files,
the Compose file, `.env`, `.data`, or migration state to the server.

Prepare the server once before the first workflow run:

1. Place the private Compose file, `.env`, persistent `.data` directory, and
   `bin.py` wrapper in the project directory.
1. Configure the private Compose service to use `stage-flow-tools:latest`.
1. Ensure `bin.py start` starts that image without building, pulling, or
   rewriting project files.
1. Validate the private Compose configuration with `docker compose config --quiet`.

Configure these GitHub repository variables and secret as documented in
[`.env.example`](../.env.example):

- `MAINTAINER_DEPLOY_SSH_HOST`
- `MAINTAINER_DEPLOY_SSH_USER`
- `MAINTAINER_DEPLOY_SSH_KNOWN_HOSTS`
- `MAINTAINER_DEPLOY_RESTART_COMMAND`, for example
  `cd <absolute-project-directory> && ./bin.py stop && ./bin.py start`
- `MAINTAINER_DEPLOY_SSH_PRIVATE_KEY` as a repository secret

The workflow verifies the loaded image ID and source revision before executing
the restart command. A failed command fails the deployment. It does not run a
remote health check, automatic rollback, or a separate migration command.
However, application startup automatically applies pending Drizzle migrations
to the persistent SQLite database. Before deploying a ref with migrations,
back up `.data` and review forward and rollback compatibility. Do not apply the
same migrations manually unless a separate supported procedure requires it.
Deployment-file changes remain manual.

## Operations

View application logs with the Compose command for the private project. Back
up its persistent `.data` directory before upgrades and before high-risk live
events. Restarting the container disconnects active WebSocket clients, which
then reconnect automatically.

## Image Layout

The Docker image uses a multi-stage build. The build stage runs `vp run build`;
the production stage contains the standalone Nuxt server output and the Drizzle
migration files needed at startup. The container starts
`node .output/server/index.mjs` directly.
