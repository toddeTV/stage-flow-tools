# Release Flow

This document outlines the automated release process for the application, which is managed by GitHub Actions and the `release-please` bot.

## Overview

The release process is triggered automatically when commits are pushed to the `main` branch. It handles versioning, changelog generation, GitHub releases, and Docker image publishing.

## Workflow

### 1. Development

Developers work on feature or fix branches and create pull requests to merge their changes into the `main` branch. Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### 2. Release Proposal

After one or more pull requests are merged into `main`, the `release-please` GitHub Action runs automatically. It analyzes the commit history since the last release and determines the next semantic version number.

If a new release is warranted, the bot creates a new pull request titled `chore(main): release [version]`. This PR includes:

- An updated `CHANGELOG.md` file.
- The new version number bumped in `package.json`.

### 3. Human Approval

A project maintainer reviews the release pull request. If everything is correct, the PR is merged into the `main` branch. This merge action is the trigger for the next step.

### 4. Release and Publication

Upon merging the release PR, the GitHub Actions workflow performs the following tasks:

1. **Creates a GitHub Release**: A new release is created on GitHub with the tag `v[version]`. The release notes are populated from the `CHANGELOG.md`.
2. **Builds Docker Image**: A new Docker image is built based on the state of the `main` branch at the release tag.
3. **Pushes to Registry**: The Docker image is pushed to the GitHub Container Registry (`ghcr.io`) with tags corresponding to the release version (e.g., `1.2.3`, `1.2`, `1`, `latest`).

The `main` branch is now updated with the latest version, and a new, versioned Docker image is available for deployment.

### 5. Cloudflare Deployment (Automatic)

Every push to `main` (including merged PRs and release merges) triggers the `deploy-cloudflare.yml` workflow:

1. The app is built for Cloudflare Workers.
1. The Worker is deployed to Cloudflare.
1. KV data (`questions`, `answers`) is reset to empty arrays.
1. Admin credentials are preserved.

After deployment, use the push script to seed quiz questions:

```bash
pnpm run deploy:push-to-cloudflare -- --questions ./my-questions.json
```

See the [Cloudflare Deployment Guide](deployment-cloudflare.md#automated-deployment-via-github-actions-cicd) for GitHub secrets setup.
