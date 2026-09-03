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
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../database/schema'
import {
  getLegalDocument,
  isLegalDocumentKey,
} from './legal-documents'

const temporaryDirectories: string[] = []

function createTemporaryDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-legal-documents-'))
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

describe('legal documents', () => {
  it('reads only configured legal document rows', () => {
    const sqlite = new Database(createTemporaryDatabasePath())

    try {
      sqlite.exec(readFileSync('server/database/migrations/0000_overrated_fallen_one.sql', 'utf8'))
      sqlite.exec(readFileSync('server/database/migrations/0001_serious_bishop.sql', 'utf8'))
      sqlite.exec(readFileSync('server/database/migrations/0002_adorable_stature.sql', 'utf8'))
      const database = drizzle(sqlite, { schema })

      database.insert(schema.legalDocuments).values({
        content: 'Last updated: 2026-09-03',
        key: 'legal-notice',
      }).run()

      expect(getLegalDocument('legal-notice', database)).toMatchObject({
        content: 'Last updated: 2026-09-03',
        key: 'legal-notice',
      })
      expect(getLegalDocument('privacy-policy', database)).toBeUndefined()
    }
    finally {
      sqlite.close()
    }
  })

  it('recognizes exactly the two public document keys', () => {
    expect(isLegalDocumentKey('legal-notice')).toBe(true)
    expect(isLegalDocumentKey('privacy-policy')).toBe(true)
    expect(isLegalDocumentKey('terms')).toBe(false)
    expect(isLegalDocumentKey(undefined)).toBe(false)
  })
})
