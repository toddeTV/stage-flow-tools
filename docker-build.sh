#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define variables
IMAGE_NAME="stage-flow-tools"
DOCKERFILE="Dockerfile"

# Build the Docker image
echo "Building Docker image: $IMAGE_NAME..."
docker build -t "$IMAGE_NAME" -f "$DOCKERFILE" .

echo "Docker image '$IMAGE_NAME' built successfully."