#!/usr/bin/env node

/**
 * Push local quiz data to Cloudflare KV.
 *
 * Resets questions and answers to a clean state, then uploads the provided
 * questions file. Admin credentials are always overwritten (never deleted)
 * so the admin login stays functional even if the script is interrupted.
 *
 * Usage:
 *   node scripts/push-to-cloudflare.mjs --questions ./my-questions.json
 *   node scripts/push-to-cloudflare.mjs --questions ./my-questions.json --admin ./my-admin.json
 *
 * Flags:
 *   --questions <path>   Path to the questions JSON file (required).
 *   --admin <path>       Path to the admin JSON file (optional).
 *                         Format: {"username": "admin", "password": "secret"}
 *                         When omitted, admin data in KV is left untouched.
 *   --namespace-id <id>  KV namespace ID. Falls back to CLOUDFLARE_KV_NAMESPACE_ID env var.
 *   --dry-run            Print the wrangler commands without executing them.
 *
 * Environment variables:
 *   CLOUDFLARE_KV_NAMESPACE_ID  - KV namespace ID (alternative to --namespace-id flag).
 *   CLOUDFLARE_API_TOKEN        - Required by wrangler for authentication.
 *   CLOUDFLARE_ACCOUNT_ID       - Required by wrangler for authentication.
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)

function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  if (idx === -1 || idx + 1 >= args.length) return undefined
  return args[idx + 1]
}

const dryRun = args.includes('--dry-run')
const questionsPath = getArg('questions')
const adminPath = getArg('admin')
const namespaceId = getArg('namespace-id') || process.env.CLOUDFLARE_KV_NAMESPACE_ID

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

if (!questionsPath) {
  console.error('Error: --questions <path> is required.')
  console.error('Usage: node scripts/push-to-cloudflare.mjs --questions ./my-questions.json')
  process.exit(1)
}

if (!namespaceId) {
  console.error('Error: KV namespace ID is required.')
  console.error('Provide --namespace-id <id> or set CLOUDFLARE_KV_NAMESPACE_ID env var.')
  process.exit(1)
}

const resolvedQuestionsPath = resolve(questionsPath)
if (!existsSync(resolvedQuestionsPath)) {
  console.error(`Error: questions file not found: ${resolvedQuestionsPath}`)
  process.exit(1)
}

// Validate questions JSON
const questionsRaw = readFileSync(resolvedQuestionsPath, 'utf-8')
let questions
try {
  questions = JSON.parse(questionsRaw)
}
catch {
  console.error(`Error: invalid JSON in ${resolvedQuestionsPath}`)
  process.exit(1)
}

if (!Array.isArray(questions)) {
  console.error('Error: questions file must contain a JSON array.')
  process.exit(1)
}

for (const [i, q] of questions.entries()) {
  if (typeof q.question_text?.en !== 'string' || q.question_text.en.trim() === '') {
    console.error(`Error: question at index ${i} is missing a non-empty "question_text.en" field.`)
    process.exit(1)
  }
  if (!Array.isArray(q.answer_options) || q.answer_options.length === 0) {
    console.error(`Error: question at index ${i} has invalid or empty "answer_options".`)
    process.exit(1)
  }
  for (const [j, opt] of q.answer_options.entries()) {
    if (typeof opt.text?.en !== 'string' || opt.text.en.trim() === '') {
      console.error(`Error: question at index ${i}, option ${j} is missing a non-empty "text.en" field.`)
      process.exit(1)
    }
  }
}

// Populate defaults for optional runtime fields
for (const q of questions) {
  if (!q.id) q.id = randomUUID()
  if (!q.key) q.key = q.id
  if (q.is_active === undefined) q.is_active = false
  if (q.is_locked === undefined) q.is_locked = true
  if (!q.createdAt) q.createdAt = new Date().toISOString()
  if (q.alreadyPublished === undefined) q.alreadyPublished = false
}

// Validate admin JSON if provided
let adminData
if (adminPath) {
  const resolvedAdminPath = resolve(adminPath)
  if (!existsSync(resolvedAdminPath)) {
    console.error(`Error: admin file not found: ${resolvedAdminPath}`)
    process.exit(1)
  }
  const adminRaw = readFileSync(resolvedAdminPath, 'utf-8')
  try {
    adminData = JSON.parse(adminRaw)
  }
  catch {
    console.error(`Error: invalid JSON in ${resolvedAdminPath}`)
    process.exit(1)
  }
  if (typeof adminData.username !== 'string' || typeof adminData.password !== 'string') {
    console.error('Error: admin JSON must have "username" and "password" string fields.')
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function run(description, args) {
  const cmdStr = `pnpm ${args.join(' ')}`
  console.log(`\n> ${description}`)
  if (dryRun) {
    console.log(`  [dry-run] ${cmdStr}`)
    return
  }
  try {
    execFileSync('pnpm', args, { stdio: 'inherit' })
  }
  catch {
    console.error(`  Command failed: ${cmdStr}`)
    process.exit(1)
  }
}

const wranglerBase = ['exec', 'wrangler', 'kv', 'key', 'put', `--namespace-id=${namespaceId}`]

console.log('=== Push to Cloudflare KV ===')
console.log(`Questions file : ${resolvedQuestionsPath}`)
console.log(`Admin file     : ${adminPath ? resolve(adminPath) : '(not provided - keeping existing)'}`)
console.log(`Namespace ID   : ${namespaceId}`)
if (dryRun) console.log('Mode           : DRY RUN')

// Step 1: Reset answers to empty array
run('Resetting answers to []', [...wranglerBase, 'answers', '[]'])

// Step 2: Upload questions (with populated defaults)
run('Uploading questions', [...wranglerBase, 'questions', JSON.stringify(questions)])

// Step 3: Upload admin data if provided (override, never delete)
if (adminData) {
  run('Uploading admin credentials', [...wranglerBase, 'admin', JSON.stringify(adminData)])
}

console.log('\n=== Done ===')
console.log(`Pushed ${questions.length} question(s) to Cloudflare KV.`)
if (adminData) {
  console.log('Admin credentials updated.')
}
else {
  console.log('Admin credentials left unchanged (no --admin flag).')
}
