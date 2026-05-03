/** Hashes a string to a 32-bit unsigned integer (djb2 algorithm). */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Mulberry32 PRNG - returns a function that produces deterministic floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Returns a shuffled copy of the array using a deterministic seed string. */
export function seededShuffle<T>(array: T[], seed: string): T[] {
  const copy = [
    ...array,
  ]
  const rng = mulberry32(hashString(seed))
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const temp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = temp
  }
  return copy
}
