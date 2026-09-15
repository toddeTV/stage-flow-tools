#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define variables
IMAGE_NAME="stage-flow-tools"
DOCKERFILE="Dockerfile"

# Build the Docker image
echo "Building Docker image: $IMAGE_NAME..."
build_version="$(date -u +%F)-local"
docker build --build-arg "STAGE_FLOW_BUILD_VERSION=$build_version" -t "$IMAGE_NAME" -f "$DOCKERFILE" .

echo "Docker image '$IMAGE_NAME' built successfully."
