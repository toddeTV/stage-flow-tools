/** Returns a random item, or undefined when no items are available. */
export function pickRandomItem<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)]
}
