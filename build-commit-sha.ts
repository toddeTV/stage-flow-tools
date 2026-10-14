import { execFileSync } from 'node:child_process'
import { normalizeCommitSha } from './shared/utils/build-info'

/** Resolve once at build time; production does not need Git or an env override. */
export function resolveBuildCommitSha(
  configuredSha: string | undefined,
  readHead: () => string = () => execFileSync('git', [
    'rev-parse',
    'HEAD',
  ], {
    cwd: new URL('.', import.meta.url),
    encoding: 'utf8',
    stdio: [
      'ignore',
      'pipe',
      'ignore',
    ],
  }),
): string {
  let value = configuredSha

  if (value === undefined) {
    try {
      value = readHead()
    }
    catch {
      throw new Error('Cannot determine build commit SHA. Set STAGE_FLOW_BUILD_COMMIT_SHA to a full Git commit SHA.')
    }
  }

  const commitSha = normalizeCommitSha(value)
  if (!commitSha) {
    throw new Error('STAGE_FLOW_BUILD_COMMIT_SHA must contain a full 40-character hexadecimal Git commit SHA.')
  }
  return commitSha
}
