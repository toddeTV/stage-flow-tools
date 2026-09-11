const emojiCooldowns = new Map<string, number>()
let nextEmojiCooldownPruneAt = 0

/** Removes expired entries so the cooldown map stays bounded. */
function pruneExpiredCooldowns(cooldownMs: number, now: number): void {
  if (now < nextEmojiCooldownPruneAt) {
    return
  }

  nextEmojiCooldownPruneAt = now + cooldownMs

  for (const [
    userId,
    timestamp,
  ] of emojiCooldowns) {
    if (now - timestamp >= cooldownMs) {
      emojiCooldowns.delete(userId)
    }
  }
}

export function checkEmojiCooldown(userId: string): boolean {
  const config = useRuntimeConfig()
  const cooldownMs = config.public.emojiCooldownMs
  const now = Date.now()

  pruneExpiredCooldowns(cooldownMs, now)

  const lastSubmission = emojiCooldowns.get(userId)

  return typeof lastSubmission === 'number' && now - lastSubmission < cooldownMs
}

/** Records the latest emoji submission timestamp for one user. */
export function updateEmojiTimestamp(userId: string): void {
  emojiCooldowns.set(userId, Date.now())
}
