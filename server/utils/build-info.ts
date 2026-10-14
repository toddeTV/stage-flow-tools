import { normalizeCommitSha } from '#shared/utils/build-info'

declare const __STAGE_FLOW_BUILD_COMMIT_SHA__: string

export function getBuildCommitSha(): string | null {
  return normalizeCommitSha(typeof __STAGE_FLOW_BUILD_COMMIT_SHA__ === 'undefined'
    ? undefined
    : __STAGE_FLOW_BUILD_COMMIT_SHA__)
}
