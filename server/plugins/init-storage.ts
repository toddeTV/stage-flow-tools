import { join } from 'node:path'
import type { InputQuestion } from '~/types'

/**
 * Nitro plugin that runs on server startup.
 * Initializes storage and loads predefined questions from the filesystem (Node.js only).
 * On Cloudflare, predefined questions are seeded via Wrangler CLI into KV storage.
 */
export default defineNitroPlugin(async () => {
  // Initialize storage defaults
  await initStorage()

  // Load predefined questions from filesystem (Node.js / Docker only)
  try {
    const fs = await import('node:fs').then(m => m.promises)
    const predefinedFile = join(process.cwd(), 'data', 'predefined-questions.json')
    const processingFile = `${predefinedFile}.processing`

    // Step 1: Rename the file to mark it as being processed
    await fs.rename(predefinedFile, processingFile)

    // Step 2: Read and parse the processing file
    const rawData = await fs.readFile(processingFile, 'utf-8')
    let predefinedQuestions: InputQuestion[]

    try {
      predefinedQuestions = JSON.parse(rawData)
    }
    catch (parseError: unknown) {
      logger_error('Malformed JSON in predefined questions file:', parseError)
      return
    }

    // Step 3: Process and merge into storage
    await processPredefinedQuestions(predefinedQuestions)

    // Step 4: Remove the processing file on success
    await fs.unlink(processingFile)
  }
  catch (error: unknown) {
    // On Cloudflare or when no predefined file exists, this is expected to fail silently
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      // No predefined questions file - this is fine
    }
    else if (
      error instanceof Error && (
        error.message?.includes('No such module')
        || error.message?.includes('not supported')
        || error.message?.includes('not implemented')
      )
    ) {
      // Node.js fs module not available (Cloudflare Workers, edge runtimes) - this is fine
    }
    else {
      logger_error('Error loading predefined questions from file:', error)
    }
  }
})
