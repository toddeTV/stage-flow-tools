export const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/i

export interface BuildInfo {
  commitSha: string | null
}

/** Unknown build metadata must never be treated as a matching commit. */
export function normalizeCommitSha(value: unknown): string | null {
  return typeof value === 'string' && COMMIT_SHA_PATTERN.test(value.trim())
    ? value.trim().toLowerCase()
    : null
}
