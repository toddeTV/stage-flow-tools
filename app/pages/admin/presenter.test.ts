// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { PresenterCurrentState, Question } from '~/types'
import type { PresenterErrorKind } from '~/composables/usePresenterQuiz'
import type { PresenterQuizStep } from '~/utils/presenter-quiz-state'
import PresenterPage from './presenter.vue'

const route = { query: {} as Record<string, unknown> }
const navigate = vi.fn()
const question: Question = {
  alreadyPublished: true,
  answer_options: [],
  createdAt: '',
  id: 'one',
  is_disabled: false,
  is_locked: false,
  key: 'one',
  question_text: { en: 'Question' },
  sortOrder: 0,
}
const emptyState: PresenterCurrentState = {
  currentQuestion: null,
  hasActiveQuestion: false,
  receivedAnswers: 0,
  receivedAnswersPercent: 0,
  totalUsers: 0,
}
const controller = {
  currentQuestion: ref<Question | null>(question),
  currentState: ref<PresenterCurrentState | null>(emptyState),
  errorKind: ref<PresenterErrorKind | null>(null),
  isInitialized: ref(true),
  isLoading: ref(false),
  isTransitioning: ref(false),
  navigate,
  questions: ref([
    question,
  ]),
  step: ref<PresenterQuizStep>({ kind: 'question', phase: 'open', questionIndex: 0 }),
}

vi.mock('~/composables/usePresenterQuiz', () => ({
  usePresenterQuiz: () => controller,
}))

const Icon = defineComponent({
  props: { name: { required: true, type: String } },
  setup: props => () => h('svg', { 'data-icon': props.name }),
})
const PresenterQuizView = defineComponent({
  emits: [
    'navigate',
  ],
  setup: (_props, { emit }) => () => h('button', {
    class: 'quiz-stub',
    onClick: () => emit('navigate', 'next'),
  }, 'quiz'),
})

function render() {
  return mount(PresenterPage, {
    global: { components: { Icon, PresenterQuizView } },
  })
}

beforeEach(() => {
  const happyWindow = window as unknown as {
    happyDOM: { settings: { disableIframePageLoading: boolean, handleDisabledFileLoadingAsSuccess: boolean } }
  }
  happyWindow.happyDOM.settings.disableIframePageLoading = true
  happyWindow.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true
  vi.spyOn(console, 'error').mockImplementation(() => {})
  route.query = {}
  navigate.mockReset()
  controller.step.value = { kind: 'question', phase: 'open', questionIndex: 0 }
  controller.isTransitioning.value = false
  controller.errorKind.value = null
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useRoute', () => route)
})

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('presenter page', () => {
  it('builds click-through emoji and leaderboard frames from prefixed parameters', async () => {
    route.query = {
      colorMode: 'dark',
      emojiBackground: '#112233',
      emojiLayer: 'foreground',
      leaderboardCore: 'true',
      leaderboardPadding: '8',
    }
    controller.step.value = { kind: 'leaderboard' }
    const wrapper = render()
    await nextTick()

    const emojiLayer = wrapper.get('.emoji-layer')
    const frames = wrapper.findAll('iframe')
    expect(wrapper.attributes('data-color-mode')).toBe('dark')
    expect(emojiLayer.classes()).toContain('is-foreground')
    expect(emojiLayer.get('iframe').attributes('tabindex')).toBe('-1')
    expect((emojiLayer.element as HTMLElement).style.pointerEvents).toBe('none')
    expect((emojiLayer.get('iframe').element as HTMLElement).style.pointerEvents).toBe('none')
    expect(frames[0]?.attributes('src')).toContain('/admin/emojis?scale=0.3&transparency=0.8')
    expect(frames[0]?.attributes('src')).toContain('background=%23112233')
    expect(frames[1]?.attributes('src')).toContain('/admin/leaderboard?colorMode=dark&padding=8')
    expect(frames[1]?.attributes('src')).toContain('core=')
    expect(frames.every(frame => !frame.attributes('src')?.includes('token'))).toBe(true)
    wrapper.unmount()
  })

  it('routes arrows through one action and ignores repeats and editable targets', async () => {
    const wrapper = render()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true }))

    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }))
    await nextTick()

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith('next')
    wrapper.unmount()
  })

  it('keeps content visible and reports refresh errors through aria-live', async () => {
    controller.errorKind.value = 'refresh'
    const wrapper = render()

    expect(wrapper.find('.quiz-stub').exists()).toBe(true)
    expect(wrapper.get('[aria-live="polite"]').text()).toBe('refreshError')
    wrapper.unmount()
  })

  it('routes mouse controls and focused leaderboard iframe arrows to the same controller', async () => {
    controller.step.value = { kind: 'leaderboard' }
    const wrapper = render()
    await nextTick()

    const buttons = wrapper.findAll('.leaderboard-navigation button')
    await buttons[0]?.trigger('click')
    await buttons[1]?.trigger('click')
    const frame = wrapper.get('.leaderboard-frame').element as HTMLIFrameElement
    const childWindow = new EventTarget()
    Object.defineProperty(frame, 'contentWindow', {
      configurable: true,
      value: childWindow,
    })
    await wrapper.get('.leaderboard-frame').trigger('load')
    childWindow.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))

    expect(navigate.mock.calls).toEqual([
      [
        'previous',
      ],
      [
        'next',
      ],
      [
        'previous',
      ],
    ])
    wrapper.unmount()
  })
})
