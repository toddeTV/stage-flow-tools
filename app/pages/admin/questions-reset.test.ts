// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import type { Question } from '~/types'
import QuestionsPage from './questions.vue'

const question: Question = {
  alreadyPublished: true,
  answer_options: [
    { text: { en: 'One' } },
    { text: { en: 'Two' } },
  ],
  createdAt: '2026-01-01T00:00:00.000Z', authoredAt: null,
  id: 'test-question',
  is_active: true,
  is_disabled: true,
  is_locked: true,
  key: 'test-question',
  question_text: { en: 'Test question' },
  sortOrder: 0,
}
const fetchedQuestions = ref<Question[]>([])
const fetchError = ref<unknown>()
const refresh = vi.fn()
const fetch = vi.fn()
let wrapper: VueWrapper

const UiButton = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})
const Passthrough = defineComponent({
  setup(_props, { slots }) { return () => h('div', slots.default?.()) },
})

function findButton(scope: Pick<DOMWrapper<Element>, 'findAll'>, text: string) {
  const button = scope.findAll('button').find(candidate => candidate.text().replace(/\s*→$/, '') === text)
  if (!button) throw new Error(`Missing button: ${text}`)
  return button
}

function dialog() {
  return wrapper.get<HTMLDialogElement>('dialog[aria-labelledby="quiz-reset-confirmation-title"]')
}

async function renderQuestions() {
  wrapper = mount(QuestionsPage, {
    attachTo: document.body,
    global: {
      stubs: {
        AdminBackLink: true,
        Icon: true,
        NuxtLink: Passthrough,
        QuestionPackageImportWizard: true,
        UiButton,
        UiInput: true,
        UiPageTitle: Passthrough,
        UiSection: Passthrough,
      },
    },
  })
  fetchedQuestions.value = [
    { ...question },
  ]
  await nextTick()
}

beforeEach(() => {
  fetchedQuestions.value = []
  fetchError.value = undefined
  refresh.mockImplementation(async () => {
    fetchError.value = undefined
    fetchedQuestions.value = [
      { ...question, alreadyPublished: false, is_active: false, is_disabled: false, is_locked: false },
    ]
  })
  fetch.mockResolvedValue({ resetQuestionCount: 1, success: true })
  vi.stubGlobal('$fetch', fetch)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useApiError', () => ({
    getErrorCode: () => undefined,
    getErrorMessage: () => 'Request failed',
    getIssueMessage: () => 'Invalid value',
  }))
  vi.stubGlobal('useFetch', () => ({ data: fetchedQuestions, error: fetchError, refresh }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useLocalization', () => ({ getLocalizedText: (value: { en: string }) => value.en }))
  vi.stubGlobal('watch', watch)
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true
  })
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})

afterEach(() => {
  wrapper?.unmount()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('admin quiz reset confirmation', () => {
  it('opens without a request and cancels without changing questions', async () => {
    await renderQuestions()
    await findButton(wrapper, 'resetQuiz').trigger('click')

    expect(dialog().element.open).toBe(true)
    expect(fetch).not.toHaveBeenCalled()

    await findButton(dialog(), 'cancelEditing').trigger('click')
    expect(dialog().element.open).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
    expect(fetchedQuestions.value).toEqual([
      question,
    ])
  })

  it('prevents duplicate requests, competing actions, Escape and backdrop dismissal while pending', async () => {
    let finish!: (result: unknown) => void
    fetch.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    await renderQuestions()
    await findButton(wrapper, 'resetQuiz').trigger('click')
    const confirm = findButton(dialog(), 'resetQuiz')
    await confirm.trigger('click')
    await confirm.trigger('click')

    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/questions/reset', { method: 'POST' })
    expect(dialog().attributes('aria-busy')).toBe('true')
    expect(confirm.element).toHaveProperty('disabled', true)
    expect(findButton(dialog(), 'cancelEditing').element).toHaveProperty('disabled', true)
    for (const action of [
      'addQuestion',
      'deleteAllQuestions',
      'publishNext',
      'unlockQuestion',
      'enableQuestion',
    ]) {
      expect(findButton(wrapper, action).element).toHaveProperty('disabled', true)
    }
    const cancel = new Event('cancel', { cancelable: true })
    dialog().element.dispatchEvent(cancel)
    expect(cancel.defaultPrevented).toBe(true)
    await dialog().trigger('click')
    expect(dialog().element.open).toBe(true)
    expect(fetchedQuestions.value[0]?.is_active).toBe(true)

    finish({ resetQuestionCount: 1, success: true })
    await vi.waitFor(() => expect(dialog().element.open).toBe(false))
    expect(refresh).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('noActiveQuestion')
    expect(fetchedQuestions.value[0]).toMatchObject({
      alreadyPublished: false, is_active: false, is_disabled: false, is_locked: false,
    })
  })

  it('keeps the dialog open with an error on failure and allows retry', async () => {
    fetch.mockRejectedValueOnce(new Error('test request failure'))
    await renderQuestions()
    await findButton(wrapper, 'resetQuiz').trigger('click')
    await findButton(dialog(), 'resetQuiz').trigger('click')

    await vi.waitFor(() => expect(dialog().get('[role="alert"]').text()).toBe('Request failed'))
    expect(dialog().element.open).toBe(true)
    expect(dialog().attributes('aria-busy')).toBe('false')
    expect(refresh).not.toHaveBeenCalled()
    expect(fetchedQuestions.value).toEqual([
      question,
    ])

    await findButton(dialog(), 'resetQuiz').trigger('click')
    await vi.waitFor(() => expect(dialog().element.open).toBe(false))
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it.each([
    'error state',
    'rejection',
  ])('recovers a failed refresh through %s without repeating the confirmed reset', async (failure) => {
    refresh.mockImplementationOnce(async () => {
      const error = new Error('test refresh failure')
      if (failure === 'rejection') throw error
      fetchError.value = error
    })
    await renderQuestions()
    await findButton(wrapper, 'resetQuiz').trigger('click')
    await findButton(dialog(), 'resetQuiz').trigger('click')

    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain('quizResetCompletedRefreshFailed'))
    expect(wrapper.get('[role="alert"]').text()).toContain('Request failed')
    expect(dialog().element.open).toBe(false)
    expect(dialog().attributes('aria-busy')).toBe('false')
    expect(wrapper.text()).toContain('noActiveQuestion')
    expect(fetch).toHaveBeenCalledOnce()

    // A closed confirmation cannot repeat the mutation.
    await findButton(dialog(), 'resetQuiz').trigger('click')
    expect(fetch).toHaveBeenCalledOnce()

    const recovery = wrapper.get('div[aria-busy]')
    await findButton(recovery, 'refreshButton').trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(false))
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/questions/reset', { method: 'POST' })
  })

  it('closes the confirmed reset before refreshing questions and prevents duplicate recovery reads', async () => {
    let finishRefresh!: () => void
    refresh.mockReturnValueOnce(new Promise<void>((resolve) => { finishRefresh = resolve }))
    await renderQuestions()
    await findButton(wrapper, 'resetQuiz').trigger('click')
    await findButton(dialog(), 'resetQuiz').trigger('click')

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    expect(dialog().element.open).toBe(false)
    expect(findButton(wrapper, 'resetQuiz').element).toHaveProperty('disabled', true)

    fetchError.value = new Error('test refresh failure')
    finishRefresh()
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))

    let finishRecovery!: () => void
    refresh.mockReturnValueOnce(new Promise<void>((resolve) => { finishRecovery = resolve }))
    const recovery = wrapper.get('div[aria-busy]')
    const retry = findButton(recovery, 'refreshButton')
    await retry.trigger('click')
    await retry.trigger('click')

    expect(refresh).toHaveBeenCalledTimes(2)
    expect(retry.element).toHaveProperty('disabled', true)
    expect(recovery.attributes('aria-busy')).toBe('true')
    expect(fetch).toHaveBeenCalledOnce()

    fetchError.value = undefined
    finishRecovery()
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(false))
  })

  it('disables reset while a publication is pending', async () => {
    let finish!: (result: unknown) => void
    fetch.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    await renderQuestions()
    await findButton(wrapper, 'publishNext').trigger('click')

    expect(findButton(wrapper, 'resetQuiz').element).toHaveProperty('disabled', true)
    await findButton(wrapper, 'resetQuiz').trigger('click')
    expect(dialog().element.open).toBe(false)

    finish(question)
    await vi.waitFor(() => expect(findButton(wrapper, 'resetQuiz').element).toHaveProperty('disabled', false))
  })
})
