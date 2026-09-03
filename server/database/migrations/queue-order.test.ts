import {
  mkdtempSync,
  readFileSync,
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
import Database from 'better-sqlite3'

const temporaryDirectories: string[] = []

function createTemporaryDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-migration-'))
  temporaryDirectories.push(directory)

  return join(directory, 'db.sqlite3')
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      force: true,
      recursive: true,
    })
  }
})

describe('question queue migration', () => {
  it('backfills sort order from creation time and ID', () => {
    const database = new Database(createTemporaryDatabasePath())

    try {
      database.exec(readFileSync('server/database/migrations/0000_overrated_fallen_one.sql', 'utf8'))
      database.prepare(`
        INSERT INTO questions (id, key, question_text, answer_options, created_at)
        VALUES (?, ?, '{"en":"Question"}', '[{"text":{"en":"One"}},{"text":{"en":"Two"}}]', ?)
      `).run('question-c', 'third', '2026-01-02T00:00:00.000Z')
      database.prepare(`
        INSERT INTO questions (id, key, question_text, answer_options, created_at)
        VALUES (?, ?, '{"en":"Question"}', '[{"text":{"en":"One"}},{"text":{"en":"Two"}}]', ?)
      `).run('question-b', 'second', '2026-01-01T00:00:00.000Z')
      database.prepare(`
        INSERT INTO questions (id, key, question_text, answer_options, created_at)
        VALUES (?, ?, '{"en":"Question"}', '[{"text":{"en":"One"}},{"text":{"en":"Two"}}]', ?)
      `).run('question-a', 'first', '2026-01-01T00:00:00.000Z')

      database.exec(readFileSync('server/database/migrations/0001_serious_bishop.sql', 'utf8'))

      expect(database.prepare('SELECT id, sort_order FROM questions ORDER BY sort_order').all()).toEqual([
        { id: 'question-a', sort_order: 0 },
        { id: 'question-b', sort_order: 1 },
        { id: 'question-c', sort_order: 2 },
      ])
    }
    finally {
      database.close()
    }
  })
})
