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
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-legal-migration-'))
  temporaryDirectories.push(directory)

  return join(directory, 'db.sqlite3')
}

function applyMigrations(database: Database.Database) {
  database.exec(readFileSync('server/database/migrations/0000_overrated_fallen_one.sql', 'utf8'))
  database.exec(readFileSync('server/database/migrations/0001_serious_bishop.sql', 'utf8'))
  database.exec(readFileSync('server/database/migrations/0002_adorable_stature.sql', 'utf8'))
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      force: true,
      recursive: true,
    })
  }
})

describe('legal document migration', () => {
  it('creates the two-key document store and refreshes updated_at', () => {
    const database = new Database(createTemporaryDatabasePath())

    try {
      applyMigrations(database)
      database.prepare(`
        INSERT INTO legal_documents (key, content, updated_at)
        VALUES ('legal-notice', 'First version', '2000-01-01T00:00:00.000Z')
      `).run()
      database.prepare(`
        UPDATE legal_documents
        SET content = 'Second version'
        WHERE key = 'legal-notice'
      `).run()

      expect(database.prepare('SELECT key, content, updated_at FROM legal_documents').get()).toEqual({
        content: 'Second version',
        key: 'legal-notice',
        updated_at: expect.not.stringMatching(/^2000-01-01T00:00:00.000Z$/),
      })
    }
    finally {
      database.close()
    }
  })

  it('rejects document keys outside the two public routes', () => {
    const database = new Database(createTemporaryDatabasePath())

    try {
      applyMigrations(database)

      expect(() => database.prepare(`
        INSERT INTO legal_documents (key, content)
        VALUES ('terms', 'Not a supported document')
      `).run()).toThrow(/CHECK constraint failed/)
    }
    finally {
      database.close()
    }
  })
})
