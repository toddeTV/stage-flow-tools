<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  canOpen: boolean
  modelValue: boolean
  noteText: string
  questionTitle: string
  stageScale: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const noteDialog = ref<HTMLDialogElement>()

function closeDialog() {
  noteDialog.value?.close()
  emit('update:modelValue', false)
}

function isEditableTarget(target: EventTarget | null) {
  if (!target || typeof target !== 'object') return false
  const element = target as { isContentEditable?: boolean, tagName?: string }
  return element.isContentEditable === true || [
    'INPUT',
    'SELECT',
    'TEXTAREA',
  ].includes(element.tagName ?? '')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) {
    event.preventDefault()
    closeDialog()
    return
  }
  if (isEditableTarget(event.target)) return
  if ((event.code === 'NumpadAdd' || event.key.toLowerCase() === 'n') && props.canOpen) {
    event.preventDefault()
    emit('update:modelValue', true)
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen || !props.canOpen) {
    noteDialog.value?.close()
    if (isOpen && !props.canOpen) emit('update:modelValue', false)
    return
  }
  noteDialog.value?.showModal()
}, { flush: 'post', immediate: true })

watch(() => props.canOpen, (canOpen) => {
  if (!canOpen && props.modelValue) closeDialog()
})

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <dialog
    v-if="props.modelValue && props.noteText"
    ref="noteDialog"
    aria-labelledby="presenter-note-title"
    class="note-modal"
    :style="{
      transform: `scale(${props.stageScale})`,
      transformOrigin: 'center',
    }"
    @click.self="closeDialog"
    @close="emit('update:modelValue', false)"
  >
    <div class="note-modal-header">
      <div>
        <span class="note-title">{{ t('discussionNote') }}</span>
        <h2 id="presenter-note-title"><QuizMarkdownText mode="inline" :text="props.questionTitle" /></h2>
      </div>
      <button
        :aria-label="t('closeNote')"
        class="note-modal-close"
        type="button"
        @click="closeDialog">
        <Icon aria-hidden="true" name="ph:x" />
      </button>
    </div>
    <p>{{ props.noteText }}</p>
  </dialog>
</template>

<i18n lang="yaml">
en:
  closeNote: Close discussion note
  discussionNote: Discussion note
de:
  closeNote: Diskussionsnotiz schließen
  discussionNote: Diskussionsnotiz
fr:
  closeNote: Fermer la note de discussion
  discussionNote: Note de discussion
ja:
  closeNote: ディスカッションノートを閉じる
  discussionNote: ディスカッションノート
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.note-modal {
  @apply m-auto max-h-[calc(100dvh-4rem)] w-[calc(100%-4rem)] max-w-3xl rounded-[2rem];
  @apply border p-6 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm;
  background: rgb(var(--presenter-panel-rgb) / var(--presenter-foreground-opacity));
  border-color: var(--presenter-border);
  color: var(--presenter-text);
  font-size: calc(1rem * var(--presenter-text-scale));
}

.note-modal-header {
  @apply flex items-center justify-between gap-3;
}

.note-title {
  @apply font-semibold uppercase tracking-[0.28em];
  color: var(--presenter-muted);
  font-size: .75em;
}

.note-modal h2 {
  @apply mt-2 leading-tight font-black;
  font-size: 1.5em;
}

.note-modal p {
  @apply mt-5 leading-relaxed;
  color: var(--presenter-copy);
  font-size: 1.125em;
}

.note-modal-close {
  @apply flex cursor-pointer items-center justify-center rounded-full border transition-colors duration-200;
  @apply disabled:cursor-not-allowed disabled:opacity-50;
  min-height: max(44px, 2.75em);
  min-width: max(44px, 2.75em);
  background: var(--presenter-control);
  border-color: var(--presenter-border);
  color: var(--presenter-text);
}

.note-modal-close:hover {
  @apply bg-slate-950 text-white;
}

.note-modal-close:focus-visible {
  @apply outline-3 outline-offset-2 outline-blue-600;
}
</style>
