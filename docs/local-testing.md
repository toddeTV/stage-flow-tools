# Local Docker Testing

This guide provides minimal instructions for building and testing the Docker container locally. This process simulates the image creation step of the CI/CD workflow.

## 1. Build the Docker Image

Ensure the Docker daemon is running on your machine. Then, from the project root, execute the build script:

```bash
./docker-build.sh
```

This command builds the image and tags it as `stage-flow-tools`.

## 2. Run the Container

### Prerequisites

Before running the container, make sure you have a `.env` file in your project root. If you don't have one, create it by copying the example file:

```bash
cp .env.example .env
```

Set `NUXT_ADMIN_PASSWORD` and `NUXT_JWT_SECRET` to separate private values in this
file before starting the container. Generate them with `openssl rand -hex 32`
and `openssl rand -hex 48`, respectively. Missing, blank, or previous published
default values prevent server startup.

### Command

To test the built image, run the following command. It mounts the local `.env` file and the `.data` directory into the container.

```bash
docker run --rm -it \
  -p 3000:3000 \
  --env-file ./.env \
  -v "$(pwd)/.data:/app/.data" \
  --name test-stage-flow \
  stage-flow-tools
```

The application will be available at `http://localhost:3000`. The container will be automatically removed when you stop it (`Ctrl+C`).

### A Note on Versioning

The local build script tags the image with `:latest` and embeds
`vYYYY-MM-DD-local` (UTC date). `vp run build` uses the same local version.
For a direct `docker build`, pass a build argument so Docker's cache cannot
reuse an image with yesterday's version:

```bash
docker build \
  --build-arg "STAGE_FLOW_BUILD_VERSION=$(date -u +%F)-local" \
  --build-arg "STAGE_FLOW_BUILD_COMMIT_SHA=$(git rev-parse HEAD)" \
  -t stage-flow-tools .
```

The value is baked into the image and cannot be changed at runtime. An explicit
`STAGE_FLOW_BUILD_VERSION=<identifier>` build argument still identifies special
non-release images. GitHub Actions uses the version from Release Please for
published release images.

The full commit SHA is embedded separately in the server at build time. Local
Nuxt builds read `git rev-parse HEAD` when `STAGE_FLOW_BUILD_COMMIT_SHA` is not
supplied. Docker excludes Git metadata, so the build argument is required;
`docker-build.sh` supplies it automatically. Missing or invalid metadata aborts
the build. It cannot be changed through runtime environment variables. Admins
can verify it through `GET /api/admin/build-info`; exports include it as
`commitSha`, independently of the JSON format's numeric `version`.
