// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n, useI18n } from 'vue-i18n'
import { computed, defineComponent, h, nextTick, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import App from '../app/app.vue'
import UiLocaleSwitcher from '../app/components/ui/UiLocaleSwitcher.vue'
import { useLocalization } from '../app/composables/useLocalization'
import { useQuestionLanguage } from '../app/composables/useQuestionLanguage'
import { defineApiHandler } from '../server/utils/api-errors'
import { requestRoute } from './helpers/h3'

const states = new Map<string, Ref>()
const route = reactive({
  path: '/de',
  query: { language: 'es', core: '' } as Record<string, unknown>,
  hash: '#answers',
  get fullPath() { return `${this.path}?${JSON.stringify(this.query)}${this.hash}` },
})
const replace = vi.fn(({ query, hash }) => {
  route.query = query
  route.hash = hash
  return Promise.resolve()
})
const question = ref<{
  question_text: Record<string, string>
  answer_options: { text: Record<string, string> }[]
}>({
  question_text: { en: 'Question', es: 'Pregunta', de: 'Frage' },
  answer_options: [
    { text: { en: 'Answer', de: 'Antwort' } },
  ],
})
const getQuestions = vi.fn()
const fetchLocales = vi.fn(async () => {
  const { default: handler } = await import('../server/api/questions/locales.get')
  const response = await requestRoute(handler, '/api/questions/locales')
  return await response.json()
})
const Content = defineComponent({
  setup() {
    const { getLocalizedText } = useLocalization()
    const { t } = useI18n()
    return () => h('main', [
      h(UiLocaleSwitcher),
      h('h1', getLocalizedText(question.value.question_text)),
      h('p', getLocalizedText(question.value.answer_options[0]?.text)),
      h('button', t('submit')),
    ])
  },
})

let uiLocale = ref('de')

async function flushLanguage() {
  await flushPromises()
  await vi.waitFor(() => expect(states.get('question-language')?.value).not.toBe(''))
  await nextTick()
}

function render() {
  const i18n = createI18n({
    legacy: false,
    locale: 'de',
    fallbackLocale: 'en',
    messages: { en: { submit: 'Send' }, de: { submit: 'Senden' } },
  })
  uiLocale = i18n.global.locale
  return mount(App, {
    global: {
      plugins: [
        i18n,
      ],
      stubs: { NuxtLayout: { template: '<slot />' }, NuxtPage: Content },
    },
  })
}

beforeEach(() => {
  states.clear()
  replace.mockClear()
  fetchLocales.mockClear()
  route.path = '/de'
  route.query = { language: 'es', core: '' }
  route.hash = '#answers'
  question.value = {
    question_text: { en: 'Question', es: 'Pregunta', de: 'Frage' },
    answer_options: [
      { text: { en: 'Answer', de: 'Antwort' } },
    ],
  }
  getQuestions.mockResolvedValue([
    question.value,
    { is_disabled: true, question_text: { en: 'Other', xx: 'Custom' }, answer_options: [] },
  ])
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('getQuestions', getQuestions)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useRouter', () => ({ replace }))
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(init()))
    return states.get(key)
  })
  vi.stubGlobal('useQuestionLanguage', useQuestionLanguage)
  vi.stubGlobal('useI18n', (options?: Parameters<typeof useI18n>[0]) => ({
    ...useI18n(options),
    locales: ref([
      { code: 'en' },
      { code: 'de' },
      { code: 'fr' },
      { code: 'ja' },
    ]),
  }))
  vi.stubGlobal('$fetch', fetchLocales)
  vi.stubGlobal('useAsyncData', (_key: string, handler: () => Promise<string[]>) => {
    const data = ref<string[]>()
    const status = ref('pending')
    void handler().then((value) => {
      data.value = value
      status.value = 'success'
    }).catch(() => { status.value = 'error' })
    return { data, status }
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('shared question language', () => {
  it('combines URL selection, the public pool, English UI, and field-level fallback', async () => {
    const wrapper = render()
    await flushLanguage()
    expect(wrapper.get('h1').text()).toBe('Pregunta')
    expect(wrapper.get('p').text()).toBe('Answer')
    expect(wrapper.get('button').text()).toBe('Send')
    expect(wrapper.get('select').attributes('aria-label')).toBe('Select language')
    expect(wrapper.findAll('option').map(option => option.text())).toEqual([
      '🇩🇪 Deutsch',
      '🇺🇸 English',
      '🇪🇸 Español',
      'xx',
    ])

    await wrapper.get('select').setValue('de')
    await nextTick()
    expect(replace).toHaveBeenLastCalledWith({ query: { language: 'de', core: '' }, hash: '#answers' })
    expect(wrapper.get('h1').text()).toBe('Frage')
    expect(wrapper.get('button').text()).toBe('Senden')

    await wrapper.get('select').setValue('es')
    question.value = { question_text: { en: 'Next question' }, answer_options: [] }
    await nextTick()
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('es')
    expect(wrapper.get('h1').text()).toBe('Next question')
    expect(fetchLocales).toHaveBeenCalledTimes(1)
    expect(fetchLocales).toHaveBeenCalledWith('/api/questions/locales')
    wrapper.unmount()
  })

  it('keeps selection and metadata across navigation, even after route locale detection', async () => {
    const wrapper = render()
    await flushLanguage()
    route.path = '/admin/results'
    route.query = {}
    uiLocale.value = 'de'
    await nextTick()
    expect(uiLocale.value).toBe('en')
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('es')
    expect(wrapper.get('button').text()).toBe('Send')
    expect(fetchLocales).toHaveBeenCalledTimes(1)
    vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
    const navigateTo = vi.fn()
    vi.stubGlobal('navigateTo', navigateTo)
    const { default: middleware } = await import('../app/middleware/question-language.global')
    middleware({ path: '/admin/results', query: { core: '' }, hash: '#result' } as never, {} as never)
    expect(navigateTo).toHaveBeenCalledWith({
      path: '/admin/results', query: { core: '', language: 'es' }, hash: '#result',
    }, { replace: true })
    wrapper.unmount()
  })

  it('uses a legacy language path when no URL preference exists', async () => {
    route.query = {}
    const wrapper = render()
    await flushLanguage()
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('de')
    expect(wrapper.get('h1').text()).toBe('Frage')
    wrapper.unmount()
  })

  it.each([
    'empty',
    'error',
  ])('offers English when the pool is %s', async (kind) => {
    if (kind === 'empty') getQuestions.mockResolvedValue([])
    else fetchLocales.mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushLanguage()
    expect(wrapper.findAll('option').map(option => option.attributes('value'))).toEqual([
      'en',
    ])
    expect(wrapper.get('h1').text()).toBe('Question')
    expect(wrapper.get('button').text()).toBe('Send')
    wrapper.unmount()
  })
})
