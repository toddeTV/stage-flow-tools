import {
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vite-plus/test'
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
  deleteQuestion,
  getAnswersForQuestion,
  getNextPublishableQuestion,
  getQuestions,
  moveQuestion,
  QuestionAnswerOptionsResetRequiredError,
  toggleQuestionDisabled,
  updateQuestion,
} from './storage'

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

beforeEach(() => {
  testClient = createLocalDatabaseClient(createTemporaryDatabasePath())
  applyLocalMigrations(testClient.db)
  globalThis.__stageFlowToolsLocalDatabaseClient = testClient
})

afterEach(() => {
  testClient.sqlite.close()
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
