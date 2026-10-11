import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { icons as phosphor } from '@iconify-json/ph'
import { describe, expect, it } from 'vite-plus/test'
import {
  collectApplicationIconUsages,
  collectIconUsages,
  validateIconBundle,
} from '../helpers/icon-bundle'

const file = 'app/components/Example.vue'

describe('icon template usage', () => {
  it('finds static and multiline names with their source lines', () => {
    expect(collectIconUsages(`<template>
  <section>
    <Icon name="ph:x" />
    <Icon
      aria-hidden="true"
      name="ph:eye"
    />
  </section>
</template>`, file)).toEqual([
      { name: 'ph:x', file, line: 3 },
      { name: 'ph:eye', file, line: 4 },
    ])
  })

  it.each([
    [
      'Icon',
      '"ph:x"',
    ],
    [
      'icon',
      "'ph:x'",
    ],
    [
      'NuxtIcon',
      '`ph:x`',
    ],
    [
      'nuxt-icon',
      "(('ph:x'))",
    ],
  ])('reads literal name bindings on %s', (tag, expression) => {
    const source = `<template><${tag} :name="${expression.replaceAll('"', '&quot;')}" /></template>`
    expect(collectIconUsages(source, file).map(usage => usage.name)).toEqual([
      'ph:x',
    ])
  })

  it('checks every result branch, including nested and parenthesized conditionals', () => {
    const source = `<template><Icon
      :name="question.is_disabled ? ('ph:eye') : (busy ? 'ph:x' : 'ph:eye-slash')"
    /></template>`
    expect(collectIconUsages(source, file).map(usage => usage.name)).toEqual([
      'ph:eye',
      'ph:x',
      'ph:eye-slash',
    ])
  })

  it('ignores comments, script strings and unrelated component attributes', () => {
    expect(collectIconUsages(`<script setup>const name = 'ph:unregistered'</script>
<template>
  <!-- <Icon name="ph:unregistered" /> -->
  <input name="ph:unregistered">
  <Icon name="ph:x" :class="style" />
</template>`, file).map(usage => usage.name)).toEqual([
      'ph:x',
    ])
  })

  it('allows SFCs without icons or templates', () => {
    expect(collectIconUsages('<template><p>Text</p></template>', file)).toEqual([])
    expect(collectIconUsages('<script setup>const count = 1</script>', file)).toEqual([])
  })

  it.each([
    'iconName',
    "'ph:' + iconName",
    'getIcon()',
    '`ph:${iconName}`',
    "enabled ? 'ph:eye' : iconName",
    "enabled && 'ph:eye'",
  ])('rejects unresolved expression %s with source context', (expression) => {
    expect(() => collectIconUsages(`<template><Icon :name="${expression}" /></template>`, file))
      .toThrow(`${file}:1: Icon names must be string literals`)
  })

  it.each([
    '<Icon />',
    '<Icon name />',
    '<Icon name="" />',
    '<Icon :name="\'\'" />',
    '<Icon :name />',
    '<Icon name="ph:x" v-bind="props" />',
    '<Icon name="ph:x" :[attribute]="value" />',
  ])('rejects missing or hidden names: %s', (icon) => {
    expect(() => collectIconUsages(`<template>${icon}</template>`, file)).toThrow(`${file}:1:`)
  })

  it('reports malformed templates and expressions instead of skipping them', () => {
    expect(() => collectIconUsages('<template><Icon name="ph:x"></template>', file)).toThrow(file)
    expect(() => collectIconUsages('<template><Icon :name="enabled ? \'ph:x\' :" /></template>', file))
      .toThrow(`${file}:1: Error parsing JavaScript expression`)
  })

  it.each([
    '<template src="./icons.html" />',
    '<template lang="pug">Icon(name="ph:x")</template>',
  ])('rejects templates that the scanner cannot inspect', (source) => {
    expect(() => collectIconUsages(source, file)).toThrow(file)
  })
})

describe('application icon discovery', () => {
  it('finds new nested SFCs while excluding test components and fixtures', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'stage-flow-icon-test-'))
    try {
      for (const path of [
        'app/pages/new/nested.vue',
        'app/components/Example.test.vue',
        'app/components/Example.spec.vue',
        'app/components/fixtures/Icon.vue',
        'app/components/__fixtures__/Icon.vue',
        'app/components/__tests__/Icon.vue',
        'app/components/tests/Icon.vue',
      ]) {
        mkdirSync(dirname(resolve(root, path)), { recursive: true })
        writeFileSync(resolve(root, path), '<template><Icon name="ph:x" /></template>')
      }
      expect(collectApplicationIconUsages(root)).toEqual([
        { name: 'ph:x', file: 'app/pages/new/nested.vue', line: 1 },
      ])
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('local icon bundle validation', () => {
  it('allows additional valid bundle entries', () => {
    const usages = collectIconUsages('<template><Icon name="ph:x" /></template>', file)
    expect(validateIconBundle(usages, [
      'ph:x',
      'ph:eye',
    ])).toEqual([])
  })

  it('validates unused bundle entries and rejects unknown collections', () => {
    expect(validateIconBundle([], [
      'ph:does-not-exist',
      'other:x',
    ])).toEqual([
      'nuxt.config.ts: other:x does not exist in the local Phosphor collection',
      'nuxt.config.ts: ph:does-not-exist does not exist in the local Phosphor collection',
    ])
  })

  it('accepts aliases present in the installed collection', () => {
    const aliases = Object.keys(phosphor.aliases ?? {}).map(name => `ph:${name}`)
    expect(validateIconBundle([], aliases)).toEqual([])
  })
})
