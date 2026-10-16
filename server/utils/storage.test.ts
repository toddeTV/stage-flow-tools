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
  getCurrentResults,
  getNextPublishableQuestion,
  getQuestions,
  getResultsForQuestion,
  importQuestionPackage,
  moveQuestion,
  publishQuestion,
  resetQuiz,
  QuestionAnswerOptionsResetRequiredError,
  QuestionKeyConflictError,
  submitAnswer,
  toggleQuestionDisabled,
  toggleQuestionLock,
  unpublishActiveQuestion,
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
  it('closes only the expected active key and preserves votes across close/reopen', async () => {
    const one = await createQuestion(createInputQuestion('one'));
    const two = await createQuestion(createInputQuestion('two'));
    await publishQuestion('one');
    await submitAnswer({
      question_id: one.id,
      user_id: 'synthetic',
      user_nickname: 'Synthetic',
      selected_answer: { en: 'One' },
    });
    await toggleQuestionLock(one.id, true);
    await toggleQuestionLock(one.id, true);
    expect(
      (await getQuestions()).find((item) => item.id === one.id)?.is_locked,
    ).toBe(true);
    await publishQuestion('two');
    expect(await unpublishActiveQuestion('one')).toBeUndefined();
    expect((await getCurrentResults())?.question.id).toBe(two.id);
    await unpublishActiveQuestion('two');
    expect((await getResultsForQuestion(one.id))?.totalVotes).toBe(1);
    await publishQuestion('one');
    await toggleQuestionLock(one.id, false);
    expect((await getCurrentResults())?.totalVotes).toBe(1);
  });
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

  it('rejects an existing key without changing questions, answers, or live state', async () => {
    const existing = await createQuestion(createInputQuestion('existing-question'))
    await publishQuestion(existing.key)
    await submitAnswer({
      question_id: existing.id,
      selected_answer: { en: 'One' },
      user_id: 'test-participant',
      user_nickname: 'Test participant',
    })
    const beforeQuestions = await getQuestions()
    const beforeAnswers = await getAnswersForQuestion(existing.id)

    await expect(importQuestionPackage(createQuestionPackage([
      { ...createInputQuestion('new-question'), is_disabled: false },
      { ...createInputQuestion(existing.key), is_disabled: true },
    ]))).rejects.toThrow(QuestionKeyConflictError)

    await expect(getQuestions()).resolves.toEqual(beforeQuestions)
    await expect(getAnswersForQuestion(existing.id)).resolves.toEqual(beforeAnswers)
  })

  it('imports optional authored dates independently of database creation and preserves them on edits', async () => {
    const authoredAt = '2020-02-29T12:30:00.000Z'
    const manual = await createQuestion(createInputQuestion('manual'))
    expect(manual.authoredAt).toBeNull()

    await expect(importQuestionPackage(createQuestionPackage([
      { ...createInputQuestion('authored'), is_disabled: true, meta: { authoredAt } },
      { ...createInputQuestion('unknown'), is_disabled: false },
      { ...createInputQuestion(''), is_disabled: false, meta: {} },
    ]))).resolves.toEqual({ createdCount: 3, updatedCount: 0 })

    const imported = await getQuestions()
    const authored = imported[1]!
    expect(imported.map(question => question.authoredAt)).toEqual([
      null,
      authoredAt,
      null,
      null,
    ])
    expect(imported.map(question => question.sortOrder)).toEqual([
      0,
      1,
      2,
      3,
    ])
    expect(authored.createdAt).not.toBe(authoredAt)
    expect(authored.is_disabled).toBe(true)
    expect(imported[3]?.key).toBeTruthy()
    const storedRow = testClient.db.select().from(questions).where(eq(questions.id, authored.id)).get()
    expect(storedRow?.authoredAt).toBe(authoredAt)

    await expect(updateQuestion(authored.id, createInputQuestion('edited'))).resolves.toMatchObject({
      question: { authoredAt, createdAt: authored.createdAt },
    })
  })

  it('rolls back every package change when a duplicate key reaches storage', async () => {
    await createQuestion(createInputQuestion('existing-question'))

    await expect(importQuestionPackage(createQuestionPackage([
      {
        ...createInputQuestion('new-before-duplicate'),
        is_disabled: false,
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

  it('resets every question and answer while preserving content and queue order', async () => {
    const first = await createQuestion(createInputQuestion('first'))
    const second = await createQuestion(createInputQuestion('second'))
    const third = await createQuestion(createInputQuestion('third'))
    await moveQuestion(third.id, 'up')
    await publishQuestion(first.key)
    await toggleQuestionLock(first.id, true)
    await toggleQuestionDisabled(second.id)
    testClient.db.update(questions)
      .set({ alreadyPublished: true, isLocked: true })
      .where(eq(questions.id, second.id)).run()
    for (const question of [
      first,
      second,
    ]) {
      testClient.db.insert(answers).values({
        questionId: question.id,
        selectedAnswer: JSON.stringify({ en: 'One' }),
        userId: 'test-participant',
        userNickname: 'Test participant',
      }).run()
    }
    const before = await getQuestions()

    const resetIds = await resetQuiz()

    expect(new Set(resetIds)).toEqual(new Set([
      first.id,
      second.id,
      third.id,
    ]))
    await expect(getQuestions()).resolves.toEqual(before.map(question => ({
      ...question,
      alreadyPublished: false,
      is_active: false,
      is_disabled: false,
      is_locked: false,
    })))
    expect(testClient.db.select().from(answers).all()).toEqual([])
    await expect(getNextPublishableQuestion()).resolves.toMatchObject({ id: first.id })
    await expect(resetQuiz()).resolves.toHaveLength(3)
    await expect(getQuestions()).resolves.toEqual(before.map(question => ({
      ...question,
      alreadyPublished: false,
      is_active: false,
      is_disabled: false,
      is_locked: false,
    })))
  })

  it('resets an empty quiz successfully', async () => {
    await expect(resetQuiz()).resolves.toEqual([])
  })

  it('rolls back answer deletion when resetting question state fails', async () => {
    const question = await createQuestion(createInputQuestion('rollback'))
    await publishQuestion(question.key)
    await submitAnswer({
      question_id: question.id,
      selected_answer: { en: 'One' },
      user_id: 'test-participant',
      user_nickname: 'Test participant',
    })
    const beforeQuestions = await getQuestions()
    const beforeAnswers = await getAnswersForQuestion(question.id)
    testClient.sqlite.exec(`
      CREATE TRIGGER reject_quiz_reset BEFORE UPDATE ON questions
      WHEN NEW.already_published = 0
      BEGIN SELECT RAISE(ABORT, 'test reset failure'); END;
    `)

    await expect(resetQuiz()).rejects.toThrow('test reset failure')
    await expect(getQuestions()).resolves.toEqual(beforeQuestions)
    await expect(getAnswersForQuestion(question.id)).resolves.toEqual(beforeAnswers)
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

  it('upserts a participant answer without replacing its original nickname', async () => {
    const question = await createQuestion(createInputQuestion('answer-upsert'))
    testClient.db.update(questions).set({ isActive: true }).where(eq(questions.id, question.id)).run()

    await expect(submitAnswer({
      question_id: question.id,
      selected_answer: { en: 'One' },
      user_id: 'participant-id',
      user_nickname: 'Original nickname',
    })).resolves.toBeUndefined()
    await expect(submitAnswer({
      question_id: question.id,
      selected_answer: { en: 'Two' },
      user_id: 'participant-id',
      user_nickname: 'Changed nickname',
    })).resolves.toBeUndefined()

    await expect(getAnswersForQuestion(question.id)).resolves.toMatchObject([
      {
        selected_answer: { en: 'Two' },
        user_id: 'participant-id',
        user_nickname: 'Original nickname',
      },
    ])
  })

  it('keeps one participant answer isolated to each question', async () => {
    const firstQuestion = await createQuestion(createInputQuestion('first-question'))
    const secondQuestion = await createQuestion(createInputQuestion('second-question'))

    testClient.db.update(questions).set({ isActive: true }).where(eq(questions.id, firstQuestion.id)).run()
    await submitAnswer({
      question_id: firstQuestion.id,
      selected_answer: { en: 'One' },
      user_id: 'participant-id',
      user_nickname: 'Participant',
    })
    testClient.db.update(questions).set({ isActive: false }).where(eq(questions.id, firstQuestion.id)).run()
    testClient.db.update(questions).set({ isActive: true }).where(eq(questions.id, secondQuestion.id)).run()
    await submitAnswer({
      question_id: secondQuestion.id,
      selected_answer: { en: 'Two' },
      user_id: 'participant-id',
      user_nickname: 'Participant',
    })

    await expect(getAnswersForQuestion(firstQuestion.id)).resolves.toMatchObject([
      {
        question_id: firstQuestion.id,
        selected_answer: { en: 'One' },
        user_id: 'participant-id',
      },
    ])
    await expect(getAnswersForQuestion(secondQuestion.id)).resolves.toMatchObject([
      {
        question_id: secondQuestion.id,
        selected_answer: { en: 'Two' },
        user_id: 'participant-id',
      },
    ])
  })

  it('counts only participant WebSockets in current results', async () => {
    const question = await createQuestion(createInputQuestion('participant-count'))
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
      await expect(getResultsForQuestion(question.id)).resolves.toMatchObject({
        totalConnections: 1,
      })
    }
    finally {
      await removePeer(defaultPeer)
      await removePeer(resultsPeer)
      await removePeer(emojiPeer)
    }
  })

  it('combines published questions and submitted answers in current results through the storage facade', async () => {
    const question = await createQuestion(createInputQuestion('current-results'))
    await publishQuestion(question.id)
    await submitAnswer({
      question_id: question.id,
      selected_answer: { en: 'One' },
      user_id: 'participant-id',
      user_nickname: 'Participant',
    })

    await expect(getCurrentResults()).resolves.toMatchObject({
      question: { id: question.id },
      results: {
        One: { count: 1 },
      },
      totalVotes: 1,
    })
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
