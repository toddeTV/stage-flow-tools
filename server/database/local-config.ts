import { resolve } from 'node:path'

function resolveProjectPath(path: string) {
  return resolve(process.cwd(), path)
}

export const localDatabasePath = resolveProjectPath('.data/db/stage-flow-tools.sqlite3')

export function getLocalDatabasePath() {
  return localDatabasePath
}

export function getLocalMigrationsFolder() {
  return resolveProjectPath('server/database/migrations')
}
