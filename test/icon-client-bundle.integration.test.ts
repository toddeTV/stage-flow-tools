import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test'
import {
  collectApplicationIconUsages,
  collectIconUsages,
  validateIconBundle,
} from './helpers/icon-bundle'
import type { IconUsage } from './helpers/icon-bundle'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
let config: typeof import('../nuxt.config').default
let usages: IconUsage[]

beforeAll(async () => {
  vi.stubGlobal('defineNuxtConfig', (value: unknown) => value)
  try {
    config = (await import('../nuxt.config')).default
  }
  finally {
    vi.unstubAllGlobals()
  }
  usages = collectApplicationIconUsages(repoRoot)
})

function bundleIcons() {
  const bundle = config.icon?.clientBundle
  if (!bundle || !bundle.icons) throw new Error('Expected an explicit Nuxt icon client bundle')
  return bundle.icons
}

describe('Nuxt icon client bundle contract', () => {
  it('registers every production template icon with valid local data', () => {
    expect(config.icon?.provider).toBe('none')
    expect(config.icon?.clientBundle?.scan).toBe(false)
    expect(usages.length).toBeGreaterThan(0)
    expect(validateIconBundle(usages, bundleIcons())).toEqual([])
  })

  it('detects the forgotten reset icon without changing the real configuration', () => {
    const resetIcon = 'ph:arrow-counter-clockwise'
    const missing = validateIconBundle(usages, bundleIcons().filter(name => name !== resetIcon))
    expect(missing).toHaveLength(1)
    expect(missing[0]).toMatch(
      /^app\/pages\/admin\/questions\.vue:\d+: ph:arrow-counter-clockwise is missing from icon\.clientBundle\.icons$/,
    )
  })

  it('requires bundle registration when a new component uses another icon', () => {
    const additional = collectIconUsages(
      '<template><Icon name="ph:acorn" /></template>',
      'app/components/NewFeature.vue',
    )
    const existing = bundleIcons().filter(name => name !== 'ph:acorn')
    expect(validateIconBundle([
      ...usages,
      ...additional,
    ], existing)).toEqual([
      'app/components/NewFeature.vue:1: ph:acorn is missing from icon.clientBundle.icons',
    ])
    expect(validateIconBundle([
      ...usages,
      ...additional,
    ], [
      ...existing,
      'ph:acorn',
    ])).toEqual([])
  })

  it('rejects a typo even when both usage and registration contain it', () => {
    const typo = 'ph:arrow-counter-clockwis'
    const additional = collectIconUsages(
      `<template><Icon name="${typo}" /></template>`,
      'app/components/NewFeature.vue',
    )
    expect(validateIconBundle([
      ...usages,
      ...additional,
    ], [
      ...bundleIcons(),
      typo,
    ])).toEqual([
      `app/components/NewFeature.vue:1: ${typo} does not exist in the local Phosphor collection`,
    ])
  })
})
