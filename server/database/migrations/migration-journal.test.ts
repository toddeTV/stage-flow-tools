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
import {
  applyLocalMigrations,
  createLocalDatabaseClient,
} from '../local-sqlite'

const temporaryDirectories: string[] = []

function createTemporaryDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-migration-journal-'))
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

describe('Drizzle migration journal', () => {
  it('applies every journal entry once to a fresh SQLite database', () => {
    const client = createLocalDatabaseClient(createTemporaryDatabasePath())
    const journal = JSON.parse(
      readFileSync('server/database/migrations/meta/_journal.json', 'utf8'),
    ) as { entries: unknown[] }

    try {
      applyLocalMigrations(client.db)
      applyLocalMigrations(client.db)

      expect(client.sqlite.prepare('SELECT COUNT(*) AS count FROM __drizzle_migrations').get()).toEqual({
        count: journal.entries.length,
      })
      expect(client.sqlite.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name IN ('answers', 'legal_documents', 'questions')
        ORDER BY name
      `).all()).toEqual([
        { name: 'answers' },
        { name: 'legal_documents' },
        { name: 'questions' },
      ])
    }
    finally {
      client.sqlite.close()
    }
  })
})
