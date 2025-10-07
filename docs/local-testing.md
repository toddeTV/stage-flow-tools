# Local Docker Testing

This guide provides minimal instructions for building and testing the Docker container locally. This process simulates the image creation step of the CI/CD workflow.

## 1. Build the Docker Image

Ensure the Docker daemon is running on your machine. Then, from the project root, execute the build script:

```bash
./docker-build.sh
```

This command builds the image and tags it as `stage-flow-tools`.

## 2. Run the Container

To test the built image, run the following command:

```bash
docker run --rm -it \
  -p 3000:3000 \
  -e NUXT_JWT_SECRET="a-random-secret-for-local-testing" \
  --name test-stage-flow \
  stage-flow-tools
```

The application will be available at `http://localhost:3000`. The container will be automatically removed when you stop it (`Ctrl+C`).

### A Note on Versioning

The local build script tags the image with `:latest`. The automated GitHub Actions workflow handles versioning for releases by automatically tagging the image with the correct semantic version (e.g., `1.2.3`, `1.2`, `1`) based on the release created by the `release-please` bot.
