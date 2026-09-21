// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { PresenterCurrentState, Question } from '~/types'
import { parsePresenterParameters } from '~/utils/presenter-parameters'
import PresenterQuizNoteDialog from './PresenterQuizNoteDialog.vue'
import PresenterQuizQuestionPanel from './PresenterQuizQuestionPanel.vue'
import PresenterQuizResultsPanel from './PresenterQuizResultsPanel.vue'
import PresenterQuizView from './PresenterQuizView.vue'

const Icon = defineComponent({
  props: { name: { required: true, type: String } },
  setup: props => () => h('svg', { 'data-icon': props.name }),
})

const QuizMarkdownText = defineComponent({
  props: {
    mode: { default: 'block', type: String },
    text: { required: true, type: String },
  },
  setup: props => () => h('span', { 'data-markdown-mode': props.mode }, props.text),
})

const question: Question = {
  alreadyPublished: true,
  answer_options: [
    { emoji: '⭐', text: { de: 'Ja', en: 'Yes' } },
    { emoji: '💡', text: { de: 'Nein', en: 'No' } },
  ],
  createdAt: '',
  id: 'one',
  is_disabled: false,
  is_locked: true,
  key: 'one',
  note: { de: 'Hinweis', en: 'Note' },
  question_text: { de: 'Frage', en: 'Question' },
  sortOrder: 0,
}

const state: PresenterCurrentState = {
  currentQuestion: {
    answer_options: [
      { count: 3, emoji: '⭐', percent: 75, text: { de: 'Ja', en: 'Yes' } },
      { count: 1, emoji: '💡', percent: 25, text: { de: 'Nein', en: 'No' } },
    ],
    createdAt: '',
    id: 'one',
    index: 1,
    is_active: true,
    is_locked: true,
    key: 'one',
    note: question.note,
    question_text: question.question_text,
    totalQuestions: 1,
  },
  hasActiveQuestion: true,
  receivedAnswers: 4,
  receivedAnswersPercent: 80,
  totalUsers: 5,
}

function render(
  phase: 'open' | 'reveal' = 'reveal',
  query: Record<string, unknown> = {},
) {
  return mount(PresenterQuizView, {
    global: {
      components: {
        Icon,
        PresenterQuizNoteDialog,
        PresenterQuizQuestionPanel,
        PresenterQuizResultsPanel,
        QuizMarkdownText,
      },
    },
    props: {
      busy: false,
      currentState: state,
      parameters: parsePresenterParameters({ language: 'de', ...query }),
      phase,
      question,
      questionIndex: 0,
      questions: [
        question,
      ],
    },
  })
}

beforeEach(() => {
  const storage = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  })
  vi.stubGlobal('useI18n', () => ({
    t: (key: string, values?: { count: number, percent: number }) => key === 'answerStats'
      ? `${values?.percent}% (${values?.count} votes)`
      : key,
  }))
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('PresenterQuizView', () => {
  it('replaces correct stars with checks, keeps other reveal emojis, and preserves mouse navigation', async () => {
    const wrapper = render()
    const buttons = wrapper.findAll('.navigation-button')
    const correctAnswer = wrapper.findAll('.answer-card')[0]

    expect(wrapper.text()).toContain('Frage')
    expect(wrapper.text()).toContain('75% (3 votes)')
    expect(wrapper.findAll('.answer-emoji').map(emoji => emoji.text())).toEqual([
      '💡',
    ])
    expect(wrapper.find('[data-icon="ph:check-fat"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('⭐')
    expect(correctAnswer?.attributes('style')).toContain('--presenter-answer-accent: #0077BB')
    expect(correctAnswer?.attributes('style')).not.toContain('border')
    expect(buttons[0]?.attributes('aria-label')).toBe('previous')
    expect(buttons[1]?.attributes('aria-label')).toBe('next')

    await buttons[0]?.trigger('click')
    await buttons[1]?.trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([
      [
        'previous',
      ],
      [
        'next',
      ],
    ])
    wrapper.unmount()
  })

  it('opens notes with N or Numpad Plus, closes with Escape, and ignores editable targets', async () => {
    const wrapper = render('reveal', { stageScale: '0.75' })
    const select = wrapper.get('select').element

    select.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'n' }))
    await nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'NumpadAdd', key: '+' }))
    await nextTick()
    expect(wrapper.get('dialog').attributes('open')).toBeDefined()
    expect((wrapper.get('dialog').element as HTMLDialogElement).style.transform).toBe('scale(0.75)')
    expect((wrapper.get('dialog').element as HTMLDialogElement).style.transformOrigin).toBe('center')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps counts, percentages, and emoji hidden while voting is open', () => {
    const wrapper = render('open')
    expect(wrapper.find('.answer-stats').classes()).toContain('is-hidden')
    expect(wrapper.find('.answer-emoji').classes()).toContain('is-hidden')
    expect(wrapper.find('[data-icon="ph:check-fat"]').exists()).toBe(false)
    expect(wrapper.find('.note-trigger').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses inline Markdown and removes Markdown punctuation from chart labels', async () => {
    const markdownQuestion: Question = {
      ...question,
      answer_options: [
        { emoji: '⭐', text: { de: '*Ja* mit `inline`', en: 'Yes' } },
        { emoji: '💡', text: { de: '```ts\nerste Zeile\nzweite Zeile\n```', en: 'No' } },
      ],
      question_text: {
        de: '**Frage**\n\n```ts\nconst value = 1\nreturn value\n```',
        en: 'Question',
      },
    }
    const wrapper = render()
    await wrapper.setProps({
      question: markdownQuestion,
      questions: [
        markdownQuestion,
      ],
    })

    const markdownTexts = wrapper.findAllComponents(QuizMarkdownText)
    expect(markdownTexts.every(markdownText => markdownText.props('mode') === 'inline')).toBe(true)
    expect(markdownTexts[0]?.props('text')).toContain('const value = 1\nreturn value')
    expect(markdownTexts[2]?.props('text')).toContain('erste Zeile\nzweite Zeile')
    expect(wrapper.get('.chart-donut').attributes('aria-label')).toBe(
      'Ja mit inline: 3 (75%), erste Zeile zweite Zeile: 1 (25%)',
    )
    wrapper.unmount()
  })
})
