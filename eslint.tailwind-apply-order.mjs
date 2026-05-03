import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Uses `eslint-plugin-tailwindcss` internals on purpose, since there is no
// public utility for sorting `@apply` tokens in plain CSS. This path may break
// on plugin upgrades. TODO: re-check and update this import when bumping
// `eslint-plugin-tailwindcss`, and add coverage that fails if the util path or
// sorting behavior changes.
const { getSortedClassNames } = require('eslint-plugin-tailwindcss/lib/util/tailwindAPI')

/**
 * Custom local ESLint plugin for this repository.
 *
 * Why this exists:
 * - `eslint-plugin-tailwindcss` sorts class names in JS/TSX/Vue class attributes.
 * - It does not validate `@apply` token order inside plain CSS declarations.
 *
 * What it does:
 * - Finds `@apply ...;` directives in CSS files.
 * - Sorts tokens with the same Tailwind ordering utility used by
 *   `eslint-plugin-tailwindcss` (`getSortedClassNames`).
 * - Reports invalid order and provides an autofix.
 */
const ruleName = 'apply-classnames-order'

/** @type {import('eslint').Rule.RuleModule} */
const applyClassnamesOrderRule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce Tailwind class order in CSS @apply directives',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          config: {
            type: [
              'string',
              'object',
            ],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      invalidOrder: 'Invalid Tailwind @apply class order',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const options = context.options[0] ?? {}
    const twConfig = options.config

    return {
      Program(node) {
        const text = sourceCode.getText()
        const applyRegex = /@apply(\s+)([^;]+);/g
        const blockCommentRegex = /\/\*[\s\S]*?\*\//g
        const blockCommentRanges = []

        for (
          let commentMatch = blockCommentRegex.exec(text);
          commentMatch !== null;
          commentMatch = blockCommentRegex.exec(text)
        ) {
          blockCommentRanges.push([
            commentMatch.index,
            commentMatch.index + commentMatch[0].length,
          ])
        }

        const isInsideBlockComment = index =>
          blockCommentRanges.some(([
            start,
            end,
          ]) => index >= start && index < end)

        for (let match = applyRegex.exec(text); match !== null; match = applyRegex.exec(text)) {
          if (isInsideBlockComment(match.index)) {
            continue
          }

          const rawClasses = match[2]
          const trimmedClasses = rawClasses.trim()

          if (!trimmedClasses) {
            continue
          }

          const classNames = trimmedClasses.split(/\s+/)

          if (classNames.length <= 1) {
            continue
          }

          const orderedClassNames = getSortedClassNames(twConfig, classNames)
          const hasSameOrder
            = orderedClassNames.length === classNames.length
              && orderedClassNames.every((className, index) => className === classNames[index])

          if (hasSameOrder) {
            continue
          }

          const expectedClassNames = orderedClassNames.join(' ')
          const classValueStart = match.index + match[0].indexOf(rawClasses)
          const classValueEnd = classValueStart + rawClasses.length
          const leadingWhitespace = rawClasses.match(/^\s*/)?.[0] ?? ''
          const trailingWhitespace = rawClasses.match(/\s*$/)?.[0] ?? ''

          context.report({
            node,
            messageId: 'invalidOrder',
            loc: {
              start: sourceCode.getLocFromIndex(classValueStart),
              end: sourceCode.getLocFromIndex(classValueEnd),
            },
            fix: fixer => fixer.replaceTextRange(
              [
                classValueStart,
                classValueEnd,
              ],
              `${leadingWhitespace}${expectedClassNames}${trailingWhitespace}`,
            ),
          })
        }
      },
    }
  },
}

export default {
  rules: {
    [ruleName]: applyClassnamesOrderRule,
  },
}
