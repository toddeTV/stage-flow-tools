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
- The initial empty manifest intentionally has no invented released version.
  The temporary `release-as: 1.0.0` configuration makes the first generated
  release PR target `v1.0.0` and lets Release Please update all three version
  files. Do not manually bump a feature branch or this configuration change to
  a stable version; merge the generated release PR instead.
- After `v1.0.0` is released, remove the temporary `release-as` setting in a
  small follow-up pull request. The manifest then records the actual released
  version and subsequent versions follow Conventional Commits normally.

## Release Bot Token

Release Please uses the repository secret `RELEASE_BOT_PAT_TOKEN`, not
`GITHUB_TOKEN`. This lets the generated release PR start the normal
`pull_request` validation workflow without manual approval.

Create a fine-grained personal access token or GitHub App token that is limited
to this repository. Grant Contents, Issues, and Pull requests read/write
access; Metadata read access is automatic. Set an expiration date, rotate the
token before it expires, and store it as the `RELEASE_BOT_PAT_TOKEN`
repository secret.

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
   output SHA, so they build the exact source that GitHub tags. On success, the
   publish job pushes that release version to GHCR.

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
