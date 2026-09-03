// @ops ops:seed:dev | Seed a fresh local SQLite development database with example questions.

import { seedDevelopmentDatabase } from '../server/database/seed.dev'

function assertDevelopmentTarget(args: string[]) {
  if (args.length !== 2 || args[0] !== '--target' || args[1] !== 'dev') {
    throw new Error('Usage: vp run ops:seed:dev')
  }
}

function main() {
  assertDevelopmentTarget(process.argv.slice(2))

  const summary = seedDevelopmentDatabase()
  console.log(`Development database seeded successfully: ${String(summary.questionCount)} questions`)
}

try {
  main()
}
catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
