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

Ensure the `NUXT_JWT_SECRET` and other variables are set correctly in this file.

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
docker build --build-arg "STAGE_FLOW_BUILD_VERSION=$(date -u +%F)-local" -t stage-flow-tools .
```

The value is baked into the image and cannot be changed at runtime. An explicit
`STAGE_FLOW_BUILD_VERSION=<identifier>` build argument still identifies special
non-release images. GitHub Actions uses the version from Release Please for
published release images.
