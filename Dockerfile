# --- Build Stage ---
# This stage builds the application. It installs all dependencies (including dev)
# and creates the optimized production output in the /.output directory.
FROM node:24-alpine AS build

# Set working directory
WORKDIR /app

# Install Vite+ CLI
RUN apk add --no-cache bash curl
ENV VP_HOME=/root/.vite-plus
ENV VP_VERSION=0.1.19
ENV PATH=${VP_HOME}/bin:${PATH}
RUN VP_NODE_MANAGER=no curl -fsSL https://vite.plus | bash

# Copy dependency manifests and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies without lifecycle scripts before copying the full source tree.
# The repo uses a postinstall hook (`nuxt prepare`), which needs project files not present yet.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store vp run install:clean -- --ignore-scripts

# Copy the rest of the application source code
COPY . .

# Build the application for production
RUN vp exec nuxt prepare
RUN vp run build:ssr

# --- Production Stage ---
# This is the final, minimal image. It only copies the standalone Nuxt output
# from the 'build' stage and runs the generated server entrypoint directly.
# No source code or package install step is needed in this stage.
FROM node:24-alpine AS production

# Set working directory
WORKDIR /app

# Copy the built output from the build stage
COPY --from=build /app/.output ./.output

# Expose the port the app runs on
EXPOSE 3000

# Set the command to start the application
CMD ["node", ".output/server/index.mjs"]