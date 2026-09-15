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

The local build script tags the image with `:latest`. Without a build argument,
the footer version embedded in a local Nuxt or Docker build is
`vYYYY-MM-DD-local` (UTC date). To identify a non-release Docker image
explicitly, pass `--build-arg STAGE_FLOW_BUILD_VERSION=<identifier>` to
`docker build`; its value is baked into the image and cannot be changed at
runtime. The automated GitHub Actions workflow handles published release image
tags from the release created by the `release-please` bot.
