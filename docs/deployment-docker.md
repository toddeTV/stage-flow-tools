# Production Deployment with Docker

This guide describes how to deploy the application to a production environment on a Linux server using Docker and Docker Compose.

## Prerequisites

- A Linux server with Docker and Docker Compose installed.
- A Traefik reverse proxy instance running and configured on the same server.
- The `traefik-public` Docker network must exist.
- A domain or subdomain pointed to the server's IP address.

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

The `docker-compose.yml` file is configured to mount the local `./data` directory into the container at `/app/data`. This ensures that all application data (questions, answers, etc.) is persisted on the host machine, even if the container is removed or recreated.

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