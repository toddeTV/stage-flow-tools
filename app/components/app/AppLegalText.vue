<script setup lang="ts">
import { renderLegalMarkdown } from '../../utils/render-legal-markdown.client'

type LegalDocument = {
  key: 'legal-notice' | 'privacy-policy'
  title: string
}

type PublicLegalDocument = {
  content: string
  key: LegalDocument['key']
  updatedAt: string
}

const props = defineProps<{
  document: LegalDocument
}>()

const contentUrl = computed(() => `/api/legal/${props.document.key}`)
const contentKey = computed(() => `legal-document:${props.document.key}`)
const {
  data: legalDocument,
  error,
  status,
} = await useFetch<PublicLegalDocument | null>(contentUrl, {
  key: contentKey,
})

const renderedContent = computed(() => legalDocument.value?.content
  ? renderLegalMarkdown(legalDocument.value.content)
  : '')
</script>

<template>
  <div class="mx-auto max-w-3xl p-5">
    <article class="border-4 border-black bg-white p-6 sm:p-10">
      <h1 class="text-3xl font-bold sm:text-4xl">
        {{ document.title }}
      </h1>
      <p class="mt-4 border-l-4 border-black bg-gray-100 p-4 text-sm">
        This legal document is provided in English only.
      </p>
      <p v-if="status === 'pending'" class="mt-8" role="status">
        Loading legal document…
      </p>
      <p v-else-if="error || !renderedContent" class="mt-8" role="alert">
        This legal document has not been configured for this installation.
      </p>
      <!-- eslint-disable vue/no-v-html -- renderLegalMarkdown sanitizes this Markdown-only output. -->
      <div
        v-else
        class="legal-document mt-8 leading-7 wrap-break-word"
        v-html="renderedContent"
      />
      <!-- eslint-enable vue/no-v-html -->
    </article>
  </div>
</template>

<style scoped>
.legal-document :deep(h1),
.legal-document :deep(h2),
.legal-document :deep(h3),
.legal-document :deep(h4) {
  margin-top: 2rem;
  font-weight: 700;
  line-height: 1.2;
}

.legal-document :deep(h1) {
  font-size: 1.875rem;
}

.legal-document :deep(h2) {
  font-size: 1.5rem;
}

.legal-document :deep(h3) {
  font-size: 1.25rem;
}

.legal-document :deep(h4) {
  font-size: 1.125rem;
}

.legal-document :deep(p),
.legal-document :deep(ul),
.legal-document :deep(ol),
.legal-document :deep(blockquote),
.legal-document :deep(table) {
  margin-top: 1rem;
}

.legal-document :deep(ul),
.legal-document :deep(ol) {
  padding-left: 1.5rem;
}

.legal-document :deep(ul) {
  list-style-type: disc;
}

.legal-document :deep(ol) {
  list-style-type: decimal;
}

.legal-document :deep(a) {
  text-decoration: underline;
}

.legal-document :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.legal-document :deep(th),
.legal-document :deep(td) {
  border: 1px solid black;
  padding: 0.5rem;
  text-align: left;
}
</style>
