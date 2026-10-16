import Database from 'better-sqlite3'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { describe, expect, it } from 'vite-plus/test'

describe('authored date migration', () => {
  it('preserves existing questions and leaves their authored date unknown', () => {
    const database = new Database(':memory:')
    const migrations = readMigrationFiles({ migrationsFolder: 'server/database/migrations' })

    try {
      for (const migration of migrations.slice(0, -1)) {
        for (const statement of migration.sql) database.exec(statement)
      }
      database.exec(`
        INSERT INTO questions (id, key, question_text, answer_options, created_at)
        VALUES ('legacy', 'legacy', '{"en":"Question"}', '[]', '2020-01-01T12:00:00.000Z')
      `)
      const before = database.prepare('SELECT * FROM questions').get()

      for (const statement of migrations.at(-1)!.sql) database.exec(statement)

      expect(database.prepare('SELECT * FROM questions').get()).toEqual({
        ...before as Record<string, unknown>,
        authored_at: null,
      })
    }
    finally {
      database.close()
    }
  })
})
