/**
 * Cloudflare Worker entry point.
 * Wraps the Nitro-generated fetch handler and exports the QuizSession Durable Object class.
 * Referenced by wrangler.toml as `main`. Built after `nuxt build` produces .output/.
 */

// Re-export the Nitro-generated Worker as the default module export
export { default } from './.output/server/index.mjs'

// Export Durable Object class so Cloudflare can instantiate it
export { QuizSession } from './cloudflare/quiz-session'
