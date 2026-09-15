# Release Flow

GitHub Actions and Release Please turn Conventional Commits on `main` into
versioned GitHub releases and Docker images.

## Version Model

- The Release Please configuration uses the pull-request-title template
  `chore: release v${version}`. A generated release PR is titled, for
  example, `chore: release v1.0.0`.
- Release Please changes `package.json`,
  `.release-please-manifest.json`, and `CHANGELOG.md` together in its
  release PR. A merged stable release must have the same version in the package
  file and manifest.
- The release manifest records the current stable version. After `v1.0.0`,
  subsequent versions follow Conventional Commits normally. Do not manually
  bump a feature branch; merge the generated release PR instead.
- Before building, the Docker workflow checks that the release tag is exactly
  `v` plus the checked-out `package.json` version. It embeds the tagless
  version (for example, `1.2.3`) in the image at compile time. The footer
  renders this as `v1.2.3`; a deployment environment variable cannot change it.
- The maintainer deployment embeds `YYYY-MM-DD-<short SHA>` for selected branches
  and commit SHAs. For a selected `v<version>` tag, it embeds the package
  version only when the checkout matches the tag and GitHub has published that
  release. A missing or mismatched release stops the deployment before building.

## Release Bot Token

Release Please uses the repository secret `RELEASE_BOT_PAT_TOKEN`, not
`GITHUB_TOKEN`. This lets the generated release PR start the normal
`pull_request` validation workflow without manual approval.

Create a fine-grained personal access token limited to this repository. Grant
Contents, Issues, and Pull requests read/write access; Metadata read access is
automatic. Set an expiration date, rotate the token before it expires, and
store it as the `RELEASE_BOT_PAT_TOKEN` repository secret.

Do not store a GitHub App installation access token in this static secret:
those tokens are short-lived. Supporting a GitHub App would require generating
a fresh installation token for every workflow run, which this workflow does not
implement.

GitHub Actions must be allowed to create pull requests in the repository
settings. The Docker publish job continues to use its separate
`GITHUB_TOKEN` with `packages: write`; do not grant package-publishing
rights to the release bot token.

## Release Flow

1. Merge Conventional Commit pull requests into `main`.
2. The workflow verifies that `RELEASE_BOT_PAT_TOKEN` is present, then Release
   Please opens or updates its release PR.
3. The release PR runs the standard validation workflow. A maintainer reviews
   and merges it after checks pass.
4. Release Please creates the `v<version>` GitHub Release from that merge.
5. The Docker smoke test and publish job both check out the Release Please
   output SHA, verify its release tag and package version, and build the exact
   source that GitHub tags. On success, the publish job pushes that release
   version to GHCR.

## Docker Image Tags

Docker metadata receives the Release Please `tag_name` directly. A stable
`v1.2.3` release produces `1.2.3`, `1.2`, `1`, and `latest` tags for
`ghcr.io/<owner>/<repository>`. The workflow does not deploy a live
environment; operators and self-hosted users select one of these tags in their
own Docker deployment.

## Docker Publish Failure

A GitHub Release can already exist when the Docker smoke test or GHCR publish
fails. Do not delete or recreate the GitHub Release or its tag, and do not
publish a later `main` commit under that version. This repository has no
automated Docker recovery workflow yet; investigate the failed run and recover
only from the released tag through a reviewed operational procedure.
