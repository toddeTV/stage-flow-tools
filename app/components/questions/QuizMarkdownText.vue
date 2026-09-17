<script setup lang="ts">
import type { QuizMarkdownMode } from '~/utils/render-quiz-markdown.client'
import { renderQuizMarkdown } from '~/utils/render-quiz-markdown.client'

const props = withDefaults(defineProps<{
  mode?: QuizMarkdownMode
  text: string
}>(), {
  mode: 'block',
})

</script>

<template>
  <!-- eslint-disable vue/no-v-html -- renderQuizMarkdown sanitizes the restricted Markdown output. -->
  <span
    class="quiz-markdown-text"
    :class="`quiz-markdown-text--${mode}`"
    v-html="renderQuizMarkdown(props.text, props.mode)"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<style scoped>
@reference "../../assets/css/main.css";

.quiz-markdown-text {
  @apply min-w-0 max-w-full;
  overflow-wrap: anywhere;
}

.quiz-markdown-text--block {
  @apply block;
}

.quiz-markdown-text--inline {
  @apply inline;
}

.quiz-markdown-text :deep(code) {
  @apply border border-current bg-gray-500/20 px-1 py-0.5 font-mono text-[.9em];
}

.quiz-markdown-text--inline :deep(code) {
  white-space: pre-wrap;
}

.quiz-markdown-text--block :deep(.quiz-markdown-paragraph) {
  @apply block;
}

.quiz-markdown-text--block :deep(.quiz-markdown-code-block) {
  @apply my-2 block max-w-full overflow-x-auto border-2 border-current bg-gray-500/10 p-3 font-normal;
  overflow-wrap: normal;
  white-space: pre;
}

.quiz-markdown-text--block :deep(.quiz-markdown-code-block:focus-visible) {
  @apply outline-3 outline-offset-2 outline-current;
}

.quiz-markdown-text--block :deep(.quiz-markdown-code-block code) {
  @apply border-0 bg-transparent p-0;
  overflow-wrap: normal;
  white-space: inherit;
}
</style>
