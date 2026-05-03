import { join } from 'node:path'
import type { InputQuestion } from '~/types'

/**
 * Nitro plugin that runs on server startup.
 * Initializes storage and loads predefined questions from the filesystem.
 */
export default defineNitroPlugin(async () => {
  // Initialize storage defaults
  await initStorage()

  // Load predefined questions from filesystem when present.
  try {
    const fs = await import('node:fs').then(m => m.promises)
    const predefinedFile = join(process.cwd(), 'data', 'predefined-questions.json')
    const processingFile = `${predefinedFile}.processing`

    // Step 1: Reuse an existing processing file before attempting a rename.
    try {
      await fs.access(processingFile)

      try {
        await fs.access(predefinedFile)
        logger_error(
          `Both ${predefinedFile} and ${processingFile} exist.`
          + ' Resolve the conflict and keep only one file before restart.',
        )
        return
      }
      catch (sourceCheckError: unknown) {
        if ((sourceCheckError as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw sourceCheckError
        }
      }
    }
    catch (error: unknown) {
      const errno = error as NodeJS.ErrnoException
      if (errno.code !== 'ENOENT') {
        throw error
      }

      try {
        await fs.rename(predefinedFile, processingFile)
      }
      catch (renameError: unknown) {
        if ((renameError as NodeJS.ErrnoException).code === 'ENOENT') {
          return
        }

        throw renameError
      }
    }

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
    logger_error('Error loading predefined questions from file:', error)
  }
})
