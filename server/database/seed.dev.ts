import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { createSeedQuestionInsert } from './question-records'
import {
  applyLocalMigrations,
  createLocalDatabaseClient,
  getLocalDatabasePath,
} from './local-sqlite'
import { developmentSeedQuestions } from './seed-data'
import {
  answers,
  questions,
} from './schema'
import type * as schema from './schema'

export interface SeedDevelopmentDatabaseOptions {
  databasePath?: string
}

export interface SeedDevelopmentDatabaseSummary {
  questionCount: number
}

function assertDevelopmentDatabaseIsEmpty(db: BetterSQLite3Database<typeof schema>) {
  const hasQuestions = db
    .select({ id: questions.id })
    .from(questions)
    .limit(1)
    .get()
  const hasAnswers = db
    .select({ id: answers.id })
    .from(answers)
    .limit(1)
    .get()

  if (hasQuestions || hasAnswers) {
    throw new Error([
      'Development seed requires an empty local database.',
      'Existing question or answer rows found. Refusing to seed over existing data.',
    ].join('\n'))
  }
}

/** Seeds two development fixtures into a fresh local SQLite database. */
export function seedDevelopmentDatabase(
  options: SeedDevelopmentDatabaseOptions = {},
): SeedDevelopmentDatabaseSummary {
  const databasePath = options.databasePath ?? getLocalDatabasePath()
  const { db, sqlite } = createLocalDatabaseClient(databasePath)

  try {
    applyLocalMigrations(db)
    assertDevelopmentDatabaseIsEmpty(db)
    db.insert(questions).values(developmentSeedQuestions.map(createSeedQuestionInsert)).run()

    return {
      questionCount: developmentSeedQuestions.length,
    }
  }
  finally {
    sqlite.close()
  }
}
