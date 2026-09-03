import {
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  afterEach,
  describe,
  expect,
  it,
} from 'vite-plus/test'
import { asc } from 'drizzle-orm'
import {
  getQuestions,
  moveQuestion,
} from '../utils/storage'
import { deserializeQuestion } from './question-records'
import { createLocalDatabaseClient } from './local-sqlite'
import { seedDevelopmentDatabase } from './seed.dev'
import { developmentSeedQuestions } from './seed-data'
import { questions } from './schema'

const temporaryDirectories: string[] = []

function createTemporaryDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-seed-'))
  temporaryDirectories.push(directory)

  return join(directory, 'db.sqlite3')
}

function expectLocalized(value: Record<string, string>) {
  expect(Object.keys(value).sort()).toEqual([
    'de',
    'en',
    'ja',
  ])

  for (const locale of Object.values(value)) {
    expect(locale).not.toBe('')
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      force: true,
      recursive: true,
    })
  }
})

describe('seedDevelopmentDatabase', () => {
  it('creates two unpublished localized example questions in an empty database', async () => {
    const databasePath = createTemporaryDatabasePath()

    expect(seedDevelopmentDatabase({ databasePath })).toEqual({
      questionCount: developmentSeedQuestions.length,
    })

    const { db, sqlite } = createLocalDatabaseClient(databasePath)

    try {
      const seededQuestions = db
        .select()
        .from(questions)
        .orderBy(asc(questions.sortOrder))
        .all()
        .map(deserializeQuestion)

      expect(seededQuestions).toHaveLength(2)
      expect(seededQuestions.map(question => question.key)).toEqual(
        developmentSeedQuestions.map(question => question.key),
      )
      expect(seededQuestions.map(question => question.sortOrder)).toEqual([
        0,
        1,
      ])

      for (const question of seededQuestions) {
        expect(question.is_active).toBe(false)
        expect(question.is_locked).toBe(false)
        expect(question.alreadyPublished).toBe(false)
        expectLocalized(question.question_text)
        expectLocalized(question.note!)
        expect(question.answer_options.filter(option => option.emoji === '⭐')).toHaveLength(1)

        for (const option of question.answer_options) {
          expectLocalized(option.text)
        }
      }

      globalThis.__stageFlowToolsLocalDatabaseClient = { db, sqlite }
      const [
        firstQuestion,
      ] = await getQuestions()

      await moveQuestion(firstQuestion!.id, 'down')

      expect((await getQuestions()).map(question => question.key)).toEqual([
        developmentSeedQuestions[1]!.key,
        developmentSeedQuestions[0]!.key,
      ])
    }
    finally {
      globalThis.__stageFlowToolsLocalDatabaseClient = undefined
      sqlite.close()
    }
  })

  it('refuses to seed over existing questions', () => {
    const databasePath = createTemporaryDatabasePath()
    seedDevelopmentDatabase({ databasePath })

    expect(() => seedDevelopmentDatabase({ databasePath })).toThrow(
      'Development seed requires an empty local database.',
    )
  })
})
