# --- Build Stage ---
# This stage builds the application. It installs all dependencies (including dev)
# and creates the optimized production output in the /.output directory.
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Enable corepack and activate pnpm
RUN corepack enable
RUN corepack prepare pnpm@10.13.1 --activate

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies with caching
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the application for production
RUN pnpm build

# --- Production Stage ---
# This is the final, minimal image. It only copies the built application
# from the 'build' stage and installs production-only dependencies.
# No source code or development dependencies are included.
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Enable corepack and activate pnpm in production stage
RUN corepack enable
RUN corepack prepare pnpm@10.13.1 --activate

# Copy the built output from the build stage
COPY --from=build /app/.output ./.output

# Copy production dependencies
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Expose the port the app runs on
EXPOSE 3000

# Set the command to start the application
CMD ["node", ".output/server/index.mjs"]