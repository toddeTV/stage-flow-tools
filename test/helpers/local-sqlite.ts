import {
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  applyLocalMigrations,
  createLocalDatabaseClient,
} from '../../server/database/local-sqlite'

export function createIntegrationDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-integration-'))
  const client = createLocalDatabaseClient(join(directory, 'db.sqlite3'))
  applyLocalMigrations(client.db)
  globalThis.__stageFlowToolsLocalDatabaseClient = client

  return {
    client,
    dispose() {
      globalThis.__stageFlowToolsLocalDatabaseClient = undefined
      client.sqlite.close()
      rmSync(directory, {
        force: true,
        recursive: true,
      })
    },
  }
}
