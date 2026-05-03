const emojiCooldowns = new Map<string, number>()

/** Removes expired entries so the cooldown map stays bounded. */
function pruneExpiredCooldowns(cooldownMs: number): void {
  const now = Date.now()

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

  pruneExpiredCooldowns(cooldownMs)

  const lastSubmission = emojiCooldowns.get(userId)

  return typeof lastSubmission === 'number' && Date.now() - lastSubmission < cooldownMs
}

/** Records the latest emoji submission timestamp for one user. */
export function updateEmojiTimestamp(userId: string): void {
  emojiCooldowns.set(userId, Date.now())
}
