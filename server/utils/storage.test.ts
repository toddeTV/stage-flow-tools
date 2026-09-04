import {
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import type { Peer } from 'crossws'
import type { QuestionPackage } from '~/types'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { WebSocketChannel } from '~/types'
import {
  applyLocalMigrations,
  createLocalDatabaseClient,
} from '../database/local-sqlite'
import {
  answers,
  questions,
} from '../database/schema'
import {
  createQuestion,
  deleteAllQuestions,
  deleteQuestion,
  getAnswersForQuestion,
  getNextPublishableQuestion,
  getQuestions,
  importQuestionPackage,
  moveQuestion,
  publishQuestion,
  QuestionAnswerOptionsResetRequiredError,
  toggleQuestionDisabled,
  updateQuestion,
} from './storage'
import {
  addPeer,
  removePeer,
} from './websocket'

const temporaryDirectories: string[] = []
let testClient: ReturnType<typeof createLocalDatabaseClient>

function createTemporaryDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-storage-'))
  temporaryDirectories.push(directory)

  return join(directory, 'db.sqlite3')
}

function createInputQuestion(key: string) {
  return {
    answer_options: [
      { text: { en: 'One' } },
      { text: { en: 'Two' } },
    ],
    key,
    note: undefined,
    question_text: { en: key },
  }
}

function createQuestionPackage(questions: QuestionPackage['questions']): QuestionPackage {
  return {
    format: 'stage-flow-tools.question-package',
    questions,
    version: 1,
  }
}

beforeEach(() => {
  testClient = createLocalDatabaseClient(createTemporaryDatabasePath())
  applyLocalMigrations(testClient.db)
  vi.stubGlobal('broadcast', vi.fn())
  globalThis.__stageFlowToolsLocalDatabaseClient = testClient
})

afterEach(() => {
  testClient.sqlite.close()
  vi.unstubAllGlobals()
  globalThis.__stageFlowToolsLocalDatabaseClient = undefined

  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      force: true,
      recursive: true,
    })
  }
})

describe('question queue storage', () => {
  it('appends questions, swaps adjacent positions, and skips disabled questions', async () => {
    const first = await createQuestion(createInputQuestion('first'))
    const second = await createQuestion(createInputQuestion('second'))
    const third = await createQuestion(createInputQuestion('third'))

    expect((await getQuestions()).map(question => question.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ])

    await moveQuestion(third.id, 'up')
    await toggleQuestionDisabled(first.id)

    expect((await getQuestions()).map(question => question.id)).toEqual([
      first.id,
      third.id,
      second.id,
    ])
    await expect(getNextPublishableQuestion()).resolves.toMatchObject({ id: third.id })
  })

  it('advances through enabled questions after the active question', async () => {
    const first = await createQuestion(createInputQuestion('first'))
    const disabled = await createQuestion(createInputQuestion('disabled'))
    const third = await createQuestion(createInputQuestion('third'))

    testClient.db.update(questions).set({ alreadyPublished: true }).where(eq(questions.id, first.id)).run()
    testClient.db.update(questions).set({ alreadyPublished: true }).where(eq(questions.id, third.id)).run()
    await toggleQuestionDisabled(disabled.id)

    await expect(getNextPublishableQuestion()).resolves.toMatchObject({ id: first.id })

    await publishQuestion(first.id)
    await expect(getNextPublishableQuestion()).resolves.toMatchObject({ id: third.id })

    await publishQuestion(disabled.id)
    await expect(getNextPublishableQuestion()).resolves.toMatchObject({ id: third.id })

    await publishQuestion(third.id)
    await expect(getNextPublishableQuestion()).resolves.toBeUndefined()
  })

  it('deletes answers with their question and reports active deletion', async () => {
    const question = await createQuestion(createInputQuestion('active-question'))
    testClient.db.update(questions).set({ isActive: true }).where(eq(questions.id, question.id)).run()

    testClient.db.insert(answers).values({
      id: 'answer-id',
      questionId: question.id,
      selectedAnswer: JSON.stringify({ en: 'One' }),
      timestamp: '2026-09-03T00:00:00.000Z',
      userId: 'participant-id',
      userNickname: 'Participant',
    }).run()

    await expect(deleteQuestion(question.id)).resolves.toMatchObject({
      id: question.id,
      is_active: true,
    })
    expect(await getQuestions()).toEqual([])
    expect(testClient.db.select().from(answers).all()).toEqual([])
  })

  it('adds package questions and updates matching keys without resetting answers or queue state', async () => {
    const existing = await createQuestion(createInputQuestion('existing-question'))
    const preserved = await createQuestion(createInputQuestion('preserved-question'))

    testClient.db.update(questions).set({
      alreadyPublished: true,
      isActive: true,
      isLocked: true,
    }).where(eq(questions.id, existing.id)).run()
    testClient.db.insert(answers).values({
      id: 'answer-id',
      questionId: existing.id,
      selectedAnswer: JSON.stringify({ en: 'One' }),
      timestamp: '2026-09-04T00:00:00.000Z',
      userId: 'participant-id',
      userNickname: 'Participant',
    }).run()

    const result = await importQuestionPackage(createQuestionPackage([
      {
        answer_options: [
          { text: { en: 'Updated one' } },
          { text: { en: 'Updated two' } },
        ],
        is_disabled: true,
        key: existing.key,
        note: { en: 'Updated note' },
        question_text: { en: 'Updated question' },
      },
      {
        answer_options: [
          { text: { en: 'New one' } },
          { text: { en: 'New two' } },
        ],
        is_disabled: false,
        key: 'new-question',
        question_text: { en: 'New question' },
      },
      {
        answer_options: [
          { text: { en: 'Generated one' } },
          { text: { en: 'Generated two' } },
        ],
        is_disabled: false,
        question_text: { en: 'Generated question' },
      },
    ]))

    expect(result).toMatchObject({
      activeQuestion: {
        id: existing.id,
        is_active: true,
        is_locked: true,
        key: existing.key,
      },
      createdCount: 2,
      updatedCount: 1,
    })
    expect((await getQuestions()).map(question => question.key)).toEqual([
      existing.key,
      preserved.key,
      'new-question',
      expect.any(String),
    ])
    expect((await getQuestions())[0]).toMatchObject({
      alreadyPublished: true,
      id: existing.id,
      is_disabled: true,
      is_locked: true,
      note: { en: 'Updated note' },
      question_text: { en: 'Updated question' },
      sortOrder: existing.sortOrder,
    })
    await expect(getAnswersForQuestion(existing.id)).resolves.toMatchObject([
      { selected_answer: { en: 'One' } },
    ])
  })

  it('rolls back every package change when a duplicate key reaches storage', async () => {
    const existing = await createQuestion(createInputQuestion('existing-question'))

    await expect(importQuestionPackage(createQuestionPackage([
      {
        ...createInputQuestion(existing.key),
        is_disabled: false,
        question_text: { en: 'This must roll back' },
      },
      {
        ...createInputQuestion('duplicate-new-question'),
        is_disabled: false,
      },
      {
        ...createInputQuestion('duplicate-new-question'),
        is_disabled: false,
      },
    ]))).rejects.toThrow()

    await expect(getQuestions()).resolves.toMatchObject([
      { question_text: { en: 'existing-question' } },
    ])
    await expect(getQuestions()).resolves.toHaveLength(1)
  })

  it('deletes all questions and answers together', async () => {
    const question = await createQuestion(createInputQuestion('question-to-clear'))
    testClient.db.insert(answers).values({
      id: 'answer-id',
      questionId: question.id,
      selectedAnswer: JSON.stringify({ en: 'One' }),
      timestamp: '2026-09-04T00:00:00.000Z',
      userId: 'participant-id',
      userNickname: 'Participant',
    }).run()

    await expect(deleteAllQuestions()).resolves.toBe(1)
    await expect(getQuestions()).resolves.toEqual([])
    expect(testClient.db.select().from(answers).all()).toEqual([])
  })

  it('updates active and previously published questions', async () => {
    const question = await createQuestion(createInputQuestion('published-question'))
    testClient.db.update(questions).set({
      alreadyPublished: true,
      isActive: true,
    }).where(eq(questions.id, question.id)).run()

    await expect(updateQuestion(question.id, {
      ...createInputQuestion('updated-question'),
    })).resolves.toMatchObject({
      answersReset: false,
      question: {
        id: question.id,
        is_active: true,
        alreadyPublished: true,
        key: 'updated-question',
        question_text: { en: 'updated-question' },
      },
    })
  })

  it('sends publication results only to results peers', async () => {
    const question = await createQuestion(createInputQuestion('published-question'))
    const createPeer = (id: string) => ({
      id,
      send: vi.fn(),
    }) as unknown as Peer & { send: ReturnType<typeof vi.fn> }
    const defaultPeer = createPeer('default-peer')
    const resultsPeer = createPeer('results-peer')
    const emojiPeer = createPeer('emoji-peer')

    await addPeer(defaultPeer, WebSocketChannel.DEFAULT, '/_ws')
    await addPeer(resultsPeer, WebSocketChannel.RESULTS, '/_ws')
    await addPeer(emojiPeer, WebSocketChannel.EMOJIS, '/_ws')
    defaultPeer.send.mockClear()
    resultsPeer.send.mockClear()
    emojiPeer.send.mockClear()

    try {
      await publishQuestion(question.id)

      expect(defaultPeer.send).not.toHaveBeenCalled()
      expect(emojiPeer.send).not.toHaveBeenCalled()
      expect(JSON.parse(resultsPeer.send.mock.calls[0]![0])).toMatchObject({
        event: 'results-update',
        data: { question: { id: question.id } },
      })
    }
    finally {
      await removePeer(defaultPeer)
      await removePeer(resultsPeer)
      await removePeer(emojiPeer)
    }
  })

  it('requires a confirmed reset before replacing answer options with submitted answers', async () => {
    const question = await createQuestion(createInputQuestion('answer-options'))
    testClient.db.insert(answers).values({
      id: 'answer-id',
      questionId: question.id,
      selectedAnswer: JSON.stringify({ en: 'One' }),
      timestamp: '2026-09-03T00:00:00.000Z',
      userId: 'participant-id',
      userNickname: 'Participant',
    }).run()

    const updatedInput = {
      ...createInputQuestion('answer-options'),
      answer_options: [
        { text: { en: 'Updated one' } },
        { text: { en: 'Two' } },
      ],
    }

    await expect(updateQuestion(question.id, updatedInput)).rejects.toThrowError(
      QuestionAnswerOptionsResetRequiredError,
    )
    await expect(getAnswersForQuestion(question.id)).resolves.toHaveLength(1)
    await expect(getQuestions()).resolves.toMatchObject([
      { answer_options: question.answer_options },
    ])

    await expect(updateQuestion(question.id, updatedInput, { resetAnswers: true })).resolves.toMatchObject({
      answersReset: true,
      question: { answer_options: updatedInput.answer_options },
    })
    await expect(getAnswersForQuestion(question.id)).resolves.toEqual([])
  })
})
