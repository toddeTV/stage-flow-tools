<script setup lang="ts">
import { safeParse } from 'valibot'
import type {
  InputQuestion,
  LocalizedString,
  Question,
} from '~/types'
import {
  getValidationIssues,
  QuestionInputSchema,
} from '#shared/utils/validation'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
  localeSwitcher: true,
})

const { t } = useI18n()
const { getLocalizedText } = useLocalization()

type QuestionFormOption = {
  text: string
  emoji?: string
}

type QuestionForm = {
  key: string
  question_text: string
  answer_options: QuestionFormOption[]
  note: string
}

function createDefaultQuestionForm(): QuestionForm {
  return {
    key: '',
    question_text: '{\n  "en": ""\n}',
    answer_options: [
      { text: '{\n  "en": ""\n}', emoji: '' },
      { text: '{\n  "en": ""\n}', emoji: '' },
    ],
    note: '{\n  "en": ""\n}',
  }
}

function stringifyLocalizedValue(value?: LocalizedString): string {
  return JSON.stringify(value ?? { en: '' }, null, 2)
}

function createQuestionFormFromQuestion(question: Question): QuestionForm {
  return {
    key: question.key,
    question_text: stringifyLocalizedValue(question.question_text),
    answer_options: question.answer_options.map(option => ({
      text: stringifyLocalizedValue(option.text),
      emoji: option.emoji ?? '',
    })),
    note: stringifyLocalizedValue(question.note),
  }
}

const activeQuestion = ref<Question | null>(null)
const allQuestions = ref<Question[]>([])
const questionDialog = ref<HTMLDialogElement>()
const publishConfirmationDialog = ref<HTMLDialogElement>()
const toggleDisabledConfirmationDialog = ref<HTMLDialogElement>()
const deleteConfirmationDialog = ref<HTMLDialogElement>()
const editingQuestionId = ref<string | null>(null)
const isSavingQuestion = ref(false)
const isResettingAnswers = ref(false)
const isUpdatingQuestionId = ref<string | null>(null)
const questionForm = ref<QuestionForm>(createDefaultQuestionForm())
const questionFormErrors = ref<Record<string, string>>({})
const questionToPublish = ref<Question | null>(null)
const questionToToggleDisabled = ref<Question | null>(null)
const questionToDelete = ref<Question | null>(null)
const isEditMode = computed(() => editingQuestionId.value !== null)
const formTitle = computed(() => isEditMode.value ? t('editQuestionTitle') : t('addQuestion'))
const submitButtonLabel = computed(() => isEditMode.value ? t('saveQuestion') : t('createQuestion'))
const { getErrorMessage, getIssueMessage } = useApiError()

function resetQuestionEditor() {
  editingQuestionId.value = null
  questionForm.value = createDefaultQuestionForm()
  questionFormErrors.value = {}
}

function closeQuestionDialog(force = false) {
  if (isSavingQuestion.value && !force) {
    return
  }

  questionDialog.value?.close()
}

function openQuestionDialog() {
  resetQuestionEditor()
  questionDialog.value?.showModal()
}

function startEditingQuestion(question: Question) {
  editingQuestionId.value = question.id
  questionForm.value = createQuestionFormFromQuestion(question)
  questionFormErrors.value = {}
  questionDialog.value?.showModal()
}

function parseQuestionFormPayload(): InputQuestion | undefined {
  questionFormErrors.value = {}
  let hasJsonError = false

  function parseJsonValue(value: string, path: string): unknown {
    try {
      return JSON.parse(value)
    }
    catch {
      hasJsonError = true
      questionFormErrors.value[path] = getIssueMessage({
        code: 'validation.invalid_json',
        path: [
          path,
        ],
      })
      return undefined
    }
  }

  const questionText = parseJsonValue(questionForm.value.question_text, 'question_text')
  const answerOptions = questionForm.value.answer_options.map((option, index) => ({
    text: parseJsonValue(option.text, `answer_options.${index}.text`),
    emoji: option.emoji,
  }))
  const parsedNote = questionForm.value.note.trim()
    ? parseJsonValue(questionForm.value.note, 'note')
    : undefined

  if (hasJsonError) {
    return undefined
  }

  const result = safeParse(QuestionInputSchema, {
    key: questionForm.value.key,
    question_text: questionText,
    answer_options: answerOptions,
    note: parsedNote,
  })

  if (!result.success) {
    for (const issue of getValidationIssues(result.issues)) {
      const path = issue.path.join('.') || 'form'
      questionFormErrors.value[path] ??= getIssueMessage(issue)
    }

    return undefined
  }

  return result.output as InputQuestion
}

const { data: fetchedQuestions, error: fetchError, refresh: loadQuestions } = useFetch<Question[]>('/api/questions')

watch(fetchedQuestions, (newQuestions) => {
  if (newQuestions && Array.isArray(newQuestions)) {
    allQuestions.value = newQuestions
    activeQuestion.value = newQuestions.find(question => question.is_active) || null

    if (editingQuestionId.value) {
      const editedQuestion = allQuestions.value.find(question => question.id === editingQuestionId.value)

      if (!editedQuestion) {
        closeQuestionDialog()
      }
    }
  }
  else {
    allQuestions.value = []
    activeQuestion.value = null
  }
})

watch(fetchError, (newError) => {
  if (newError) {
    logger_error('Failed to load questions:', newError)
    activeQuestion.value = null
  }
})

async function handleSaveQuestion() {
  const payload = parseQuestionFormPayload()

  if (!payload) {
    return
  }

  isSavingQuestion.value = true

  try {
    if (editingQuestionId.value) {
      await $fetch<Question>('/api/questions/update', {
        method: 'POST',
        body: {
          questionId: editingQuestionId.value,
          ...payload,
        },
      })
    }
    else {
      await $fetch<Question>('/api/questions/create', {
        method: 'POST',
        body: payload,
      })
    }

    await loadQuestions()
    closeQuestionDialog(true)
  }
  catch (error: unknown) {
    alert(getErrorMessage(error))
  }
  finally {
    isSavingQuestion.value = false
  }
}

function requestQuestionPublication(question: Question) {
  if (isUpdatingQuestionId.value) {
    return
  }

  questionToPublish.value = question
  publishConfirmationDialog.value?.showModal()
}

function closePublishConfirmationDialog() {
  publishConfirmationDialog.value?.close()
}

function resetPublishConfirmationDialog() {
  questionToPublish.value = null
}

async function publishQuestion() {
  const questionToPublishValue = questionToPublish.value

  if (!questionToPublishValue || isUpdatingQuestionId.value) {
    return
  }

  isUpdatingQuestionId.value = questionToPublishValue.id

  try {
    const question = await $fetch<Question>('/api/questions/publish', {
      method: 'POST',
      body: { key: questionToPublishValue.key },
    })

    activeQuestion.value = question
    await loadQuestions()
    closePublishConfirmationDialog()
  }
  catch (error: unknown) {
    alert(getErrorMessage(error))
  }
  finally {
    isUpdatingQuestionId.value = null
  }
}

async function moveQuestion(question: Question, direction: 'up' | 'down') {
  if (isUpdatingQuestionId.value) {
    return
  }

  isUpdatingQuestionId.value = question.id

  try {
    await $fetch<Question>('/api/questions/move', {
      method: 'POST',
      body: {
        direction,
        questionId: question.id,
      },
    })
    await loadQuestions()
  }
  catch (error: unknown) {
    alert(getErrorMessage(error))
  }
  finally {
    isUpdatingQuestionId.value = null
  }
}

function requestQuestionDisabledToggle(question: Question) {
  if (isUpdatingQuestionId.value) {
    return
  }

  questionToToggleDisabled.value = question
  toggleDisabledConfirmationDialog.value?.showModal()
}

function closeToggleDisabledConfirmationDialog() {
  toggleDisabledConfirmationDialog.value?.close()
}

function resetToggleDisabledConfirmationDialog() {
  questionToToggleDisabled.value = null
}

async function toggleQuestionDisabled() {
  const questionToToggleDisabledValue = questionToToggleDisabled.value

  if (!questionToToggleDisabledValue || isUpdatingQuestionId.value) {
    return
  }

  isUpdatingQuestionId.value = questionToToggleDisabledValue.id

  try {
    await $fetch<Question>('/api/questions/toggle-disabled', {
      method: 'POST',
      body: { questionId: questionToToggleDisabledValue.id },
    })
    await loadQuestions()
    closeToggleDisabledConfirmationDialog()
  }
  catch (error: unknown) {
    alert(getErrorMessage(error))
  }
  finally {
    isUpdatingQuestionId.value = null
  }
}

function requestQuestionDeletion(question: Question) {
  if (isUpdatingQuestionId.value) {
    return
  }

  questionToDelete.value = question
  deleteConfirmationDialog.value?.showModal()
}

function closeDeleteConfirmationDialog() {
  deleteConfirmationDialog.value?.close()
}

function resetDeleteConfirmationDialog() {
  questionToDelete.value = null
}

async function deleteQuestion() {
  const questionToDeleteValue = questionToDelete.value

  if (!questionToDeleteValue || isUpdatingQuestionId.value) {
    return
  }

  isUpdatingQuestionId.value = questionToDeleteValue.id

  try {
    await $fetch('/api/questions/delete', {
      method: 'POST',
      body: { questionId: questionToDeleteValue.id },
    })
    await loadQuestions()
    closeDeleteConfirmationDialog()
  }
  catch (error: unknown) {
    alert(getErrorMessage(error))
  }
  finally {
    isUpdatingQuestionId.value = null
  }
}

async function toggleLock() {
  if (!activeQuestion.value) return

  try {
    const question = await $fetch<Question>('/api/questions/toggle-lock', {
      method: 'POST',
      body: { questionId: activeQuestion.value.id },
    })

    activeQuestion.value = question
  }
  catch (error: unknown) {
    logger_error('Failed to toggle lock status from results page', error)
    alert(getErrorMessage(error))
  }
}

async function unpublishActiveQuestion() {
  try {
    await $fetch('/api/questions/unpublish-active', {
      method: 'POST',
    })
    activeQuestion.value = null
    await loadQuestions()
  }
  catch (error) {
    alert(getErrorMessage(error))
  }
}

async function publishNextQuestion() {
  try {
    const question = await $fetch<Question>('/api/questions/publish-next', {
      method: 'POST',
    })
    activeQuestion.value = question
    await loadQuestions()
  }
  catch (error) {
    alert(getErrorMessage(error))
  }
}

async function resetAnswers() {
  if (!activeQuestion.value || isResettingAnswers.value) {
    return
  }

  if (!window.confirm(t('confirmResetAnswers'))) {
    return
  }

  isResettingAnswers.value = true

  try {
    await $fetch('/api/answers/reset', {
      method: 'POST',
    })

    await loadQuestions()
  }
  catch (error: unknown) {
    logger_error('Failed to reset answers from questions page', error)
    alert(getErrorMessage(error))
  }
  finally {
    isResettingAnswers.value = false
  }
}

function addOption() {
  questionForm.value.answer_options.push({ text: '{\n  "en": ""\n}', emoji: '' })
}

function removeOption(index: number) {
  questionForm.value.answer_options.splice(index, 1)
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-5">
    <UiPageTitle>{{ t('pageTitle') }}</UiPageTitle>

    <div class="grid gap-8">
      <UiSection>
        <div class="mb-5 flex items-center justify-between">
          <h2 class="section-heading">
            {{ t('currentActiveQuestion') }}
          </h2>
          <UiButton variant="secondary" @click="loadQuestions">
            {{ t('refreshButton') }}
          </UiButton>
        </div>
        <div v-if="activeQuestion" class="border-2 border-black bg-gray-100 p-5">
          <p class="mb-4 text-lg font-bold">
            {{ getLocalizedText(activeQuestion.question_text) }}
          </p>
          <ul class="mb-5 list-none p-0">
            <li
              v-for="(option, index) in activeQuestion.answer_options"
              :key="index"
              class="mb-1.5 border border-black bg-white p-2.5"
            >
              {{ getLocalizedText(option.text) }} <span v-if="option.emoji">{{ option.emoji }}</span>
            </li>
          </ul>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span>{{ t('statusLabel') }} {{ activeQuestion.is_locked ? t('locked') : t('unlocked') }}</span>
            <div class="flex flex-wrap gap-2.5">
              <NuxtLink to="/admin/results">
                <UiButton variant="secondary">
                  {{ t('viewLiveResults') }} →
                </UiButton>
              </NuxtLink>
              <UiButton @click="toggleLock">
                {{ activeQuestion.is_locked ? t('unlockQuestion') : t('lockQuestion') }}
              </UiButton>
              <UiButton :disabled="isResettingAnswers" variant="danger" @click="resetAnswers">
                {{ isResettingAnswers ? t('resettingAnswers') : t('resetAnswers') }}
              </UiButton>
              <UiButton variant="secondary" @click="publishNextQuestion">
                {{ t('publishNext') }} →
              </UiButton>
              <UiButton variant="secondary" @click="unpublishActiveQuestion">
                {{ t('unpublishButton') }}
              </UiButton>
            </div>
          </div>
        </div>
        <div v-else class="border-2 border-dashed border-black bg-gray-100 p-10 text-center">
          {{ t('noActiveQuestion') }}
        </div>
      </UiSection>

      <UiSection>
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 class="section-heading mb-0">
            {{ t('allQuestions') }}
          </h2>
          <UiButton @click="openQuestionDialog">
            {{ t('addQuestion') }}
          </UiButton>
        </div>

        <ol class="flex list-none flex-col gap-4 p-0">
          <li
            v-for="(question, index) in allQuestions"
            :key="question.id"
            class="border-2 border-black bg-gray-100 p-5"
            :class="{
              'bg-amber-100': question.is_disabled,
            }"
          >
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div class="min-w-0">
                <div class="mb-3">
                  <p class="font-bold">
                    {{ index + 1 }}. [{{ question.key }}] {{ getLocalizedText(question.question_text) }}
                  </p>
                </div>

                <p v-if="question.is_disabled" class="mb-3 text-sm font-bold">
                  {{ t('disabledQuestion') }}
                </p>
                <p v-if="question.note" class="mb-3 border border-black bg-gray-200 p-2 text-sm text-gray-600">
                  {{ getLocalizedText(question.note) }}
                </p>
                <ul class="mb-4 list-inside list-disc p-0">
                  <li v-for="(option, optionIndex) in question.answer_options" :key="optionIndex">
                    {{ getLocalizedText(option.text) }} <span v-if="option.emoji">{{ option.emoji }}</span>
                  </li>
                </ul>

                <div class="flex flex-wrap gap-2.5">
                  <UiButton :disabled="isUpdatingQuestionId !== null" @click="requestQuestionPublication(question)">
                    {{ t('publishThisQuestion') }}
                  </UiButton>
                  <UiButton
                    class="inline-flex items-center gap-2"
                    :disabled="isUpdatingQuestionId !== null"
                    variant="secondary"
                    @click="requestQuestionDisabledToggle(question)"
                  >
                    <Icon
                      aria-hidden="true"
                      class="size-5"
                      :name="question.is_disabled ? 'ph:eye' : 'ph:eye-slash'"
                    />
                    {{ question.is_disabled ? t('enableQuestion') : t('disableQuestion') }}
                  </UiButton>
                  <UiButton
                    :aria-label="t('editQuestion')"
                    class="inline-flex items-center gap-2"
                    :disabled="isUpdatingQuestionId !== null"
                    variant="secondary"
                    @click="startEditingQuestion(question)"
                  >
                    <Icon aria-hidden="true" class="size-5" name="ph:pencil" />
                    {{ t('editQuestion') }}
                  </UiButton>
                  <UiButton
                    :aria-label="t('deleteQuestion')"
                    class="inline-flex items-center gap-2"
                    :disabled="isUpdatingQuestionId !== null"
                    variant="danger"
                    @click="requestQuestionDeletion(question)"
                  >
                    <Icon aria-hidden="true" class="size-5" name="ph:trash" />
                    {{ t('deleteQuestion') }}
                  </UiButton>
                  <div class="ml-auto flex gap-2.5">
                    <UiButton
                      :aria-label="t('moveQuestionUp')"
                      :disabled="index === 0 || isUpdatingQuestionId !== null"
                      size="small"
                      variant="secondary"
                      @click="moveQuestion(question, 'up')"
                    >
                      <Icon aria-hidden="true" class="size-5" name="ph:arrow-up" />
                    </UiButton>
                    <UiButton
                      :aria-label="t('moveQuestionDown')"
                      :disabled="index === allQuestions.length - 1 || isUpdatingQuestionId !== null"
                      size="small"
                      variant="secondary"
                      @click="moveQuestion(question, 'down')"
                    >
                      <Icon aria-hidden="true" class="size-5" name="ph:arrow-down" />
                    </UiButton>
                  </div>
                </div>
              </div>
              <aside class="ml-5 self-start border-2 border-black bg-white p-4 lg:ml-0">
                <h3 class="text-sm font-bold tracking-wide uppercase">
                  {{ t('questionLifecycle') }}
                </h3>
                <table class="mt-3 w-full border-collapse text-left text-sm">
                  <tbody>
                    <tr class="border-b border-gray-300">
                      <th class="py-2 pr-4 text-left font-bold" scope="row">{{ t('queuePosition') }}</th>
                      <td class="py-2 text-left">{{ index + 1 }}</td>
                    </tr>
                    <tr class="border-b border-gray-300">
                      <th class="py-2 pr-4 text-left font-bold" scope="row">{{ t('disabledStatus') }}</th>
                      <td class="py-2 text-left">{{ question.is_disabled ? t('yes') : t('no') }}</td>
                    </tr>
                    <tr class="border-b border-gray-300">
                      <th class="py-2 pr-4 text-left font-bold" scope="row">{{ t('activeStatus') }}</th>
                      <td class="py-2 text-left">{{ question.is_active ? t('yes') : t('no') }}</td>
                    </tr>
                    <tr class="border-b border-gray-300">
                      <th class="py-2 pr-4 text-left font-bold" scope="row">{{ t('alreadyAskedStatus') }}</th>
                      <td class="py-2 text-left">{{ question.alreadyPublished ? t('yes') : t('no') }}</td>
                    </tr>
                    <tr>
                      <th class="py-2 pr-4 text-left font-bold" scope="row">{{ t('answersLockedStatus') }}</th>
                      <td class="py-2 text-left">{{ question.is_locked ? t('yes') : t('no') }}</td>
                    </tr>
                  </tbody>
                </table>
              </aside>
            </div>
          </li>
        </ol>
      </UiSection>
    </div>

    <dialog
      ref="questionDialog"
      :aria-busy="isSavingQuestion"
      aria-labelledby="question-editor-title"
      class="m-auto max-h-[calc(100dvh-2.5rem)] w-[calc(100%-2.5rem)] max-w-3xl overflow-y-auto
        border-[3px] border-black bg-white p-6 text-black backdrop:bg-black/50"
      @click.self="() => closeQuestionDialog()"
      @close="resetQuestionEditor"
    >
      <h2 id="question-editor-title" class="section-heading">
        {{ formTitle }}
      </h2>

      <form class="flex flex-col gap-5" @submit.prevent="handleSaveQuestion">
        <UiInput
          v-model="questionForm.key"
          class="border-2 border-black p-3 text-base"
          :placeholder="t('keyPlaceholder')"
        />
        <textarea
          v-model="questionForm.question_text"
          :aria-describedby="questionFormErrors.question_text ? 'question-text-error' : undefined"
          :aria-invalid="Boolean(questionFormErrors.question_text)"
          class="json-textarea min-h-[100px]"
          :placeholder="t('questionTextPlaceholder')"
          required
        />
        <p v-if="questionFormErrors.question_text" id="question-text-error" role="alert">
          {{ questionFormErrors.question_text }}
        </p>

        <textarea
          v-model="questionForm.note"
          :aria-describedby="questionFormErrors.note ? 'note-error' : undefined"
          :aria-invalid="Boolean(questionFormErrors.note)"
          class="json-textarea min-h-[70px]"
          :placeholder="t('notePlaceholder')"
        />
        <p v-if="questionFormErrors.note" id="note-error" role="alert">
          {{ questionFormErrors.note }}
        </p>

        <div>
          <h3 class="mb-2.5 text-lg">
            {{ t('answerOptions') }}
          </h3>
          <p v-if="questionFormErrors.answer_options" role="alert">
            {{ questionFormErrors.answer_options }}
          </p>
          <div
            v-for="(option, index) in questionForm.answer_options"
            :key="index"
            class="mb-2.5 flex flex-wrap items-start gap-2.5"
          >
            <div class="min-w-0 flex-1">
              <textarea
                v-model="option.text"
                :aria-describedby="questionFormErrors[`answer_options.${index}.text`]
                  ? `answer-option-${index}-text-error`
                  : undefined"
                :aria-invalid="Boolean(questionFormErrors[`answer_options.${index}.text`])"
                class="json-textarea min-h-[70px] w-full"
                :placeholder="t('optionPlaceholder', { n: index + 1 })"
                required
              />
              <p
                v-if="questionFormErrors[`answer_options.${index}.text`]"
                :id="`answer-option-${index}-text-error`"
                role="alert"
              >
                {{ questionFormErrors[`answer_options.${index}.text`] }}
              </p>
            </div>
            <div>
              <UiInput
                :aria-describedby="questionFormErrors[`answer_options.${index}.emoji`]
                  ? `answer-option-${index}-emoji-error`
                  : undefined"
                :aria-invalid="Boolean(questionFormErrors[`answer_options.${index}.emoji`])"
                class="w-24"
                maxlength="10"
                :model-value="option.emoji || ''"
                :placeholder="t('emojiPlaceholder')"
                @update:model-value="option.emoji = String($event || '').trim() || undefined"
              />
              <p
                v-if="questionFormErrors[`answer_options.${index}.emoji`]"
                :id="`answer-option-${index}-emoji-error`"
                role="alert"
              >
                {{ questionFormErrors[`answer_options.${index}.emoji`] }}
              </p>
            </div>
            <UiButton
              v-if="questionForm.answer_options.length > 2"
              type="button"
              variant="danger"
              @click="removeOption(index)"
            >
              {{ t('removeButton') }}
            </UiButton>
          </div>
          <UiButton type="button" variant="secondary" @click="addOption">
            {{ t('addOptionButton') }}
          </UiButton>
        </div>

        <div class="flex flex-wrap gap-2.5">
          <UiButton :disabled="isSavingQuestion" type="submit">
            {{ submitButtonLabel }}
          </UiButton>
          <UiButton
            :disabled="isSavingQuestion"
            type="button"
            variant="secondary"
            @click="closeQuestionDialog"
          >
            {{ t('cancelEditing') }}
          </UiButton>
        </div>
      </form>
    </dialog>

    <dialog
      ref="publishConfirmationDialog"
      :aria-busy="isUpdatingQuestionId === questionToPublish?.id"
      aria-describedby="publish-question-confirmation-description"
      aria-labelledby="publish-question-confirmation-title"
      class="m-auto w-[calc(100%-2.5rem)] max-w-lg border-[3px] border-black bg-white p-6 text-black
        backdrop:bg-black/50"
      @click.self="() => closePublishConfirmationDialog()"
      @close="resetPublishConfirmationDialog"
    >
      <h2 id="publish-question-confirmation-title" class="text-3xl font-bold uppercase">
        {{ t('publishQuestionTitle') }}
      </h2>
      <p id="publish-question-confirmation-description" class="mt-4">
        {{ t('confirmPublishQuestion', { key: questionToPublish?.key ?? '' }) }}
      </p>
      <div class="mt-6 flex flex-wrap justify-end gap-2.5">
        <UiButton
          :disabled="isUpdatingQuestionId !== null"
          @click="publishQuestion"
        >
          {{ t('publishThisQuestion') }}
        </UiButton>
        <UiButton
          :disabled="isUpdatingQuestionId !== null"
          variant="secondary"
          @click="closePublishConfirmationDialog"
        >
          {{ t('cancelEditing') }}
        </UiButton>
      </div>
    </dialog>

    <dialog
      ref="toggleDisabledConfirmationDialog"
      :aria-busy="isUpdatingQuestionId === questionToToggleDisabled?.id"
      aria-describedby="toggle-disabled-question-confirmation-description"
      aria-labelledby="toggle-disabled-question-confirmation-title"
      class="m-auto w-[calc(100%-2.5rem)] max-w-lg border-[3px] border-black bg-white p-6 text-black
        backdrop:bg-black/50"
      @click.self="() => closeToggleDisabledConfirmationDialog()"
      @close="resetToggleDisabledConfirmationDialog"
    >
      <h2 id="toggle-disabled-question-confirmation-title" class="text-3xl font-bold uppercase">
        {{ questionToToggleDisabled?.is_disabled ? t('enableQuestion') : t('disableQuestion') }}
      </h2>
      <p id="toggle-disabled-question-confirmation-description" class="mt-4">
        {{ questionToToggleDisabled?.is_disabled
          ? t('confirmEnableQuestion', { key: questionToToggleDisabled.key })
          : t('confirmDisableQuestion', { key: questionToToggleDisabled?.key ?? '' }) }}
      </p>
      <div class="mt-6 flex flex-wrap justify-end gap-2.5">
        <UiButton
          :disabled="isUpdatingQuestionId !== null"
          @click="toggleQuestionDisabled"
        >
          {{ questionToToggleDisabled?.is_disabled ? t('enableQuestion') : t('disableQuestion') }}
        </UiButton>
        <UiButton
          :disabled="isUpdatingQuestionId !== null"
          variant="secondary"
          @click="closeToggleDisabledConfirmationDialog"
        >
          {{ t('cancelEditing') }}
        </UiButton>
      </div>
    </dialog>

    <dialog
      ref="deleteConfirmationDialog"
      :aria-busy="isUpdatingQuestionId === questionToDelete?.id"
      aria-describedby="delete-question-confirmation-description"
      aria-labelledby="delete-question-confirmation-title"
      class="m-auto w-[calc(100%-2.5rem)] max-w-lg border-[3px] border-black bg-white p-6 text-black
        backdrop:bg-black/50"
      @click.self="() => closeDeleteConfirmationDialog()"
      @close="resetDeleteConfirmationDialog"
    >
      <h2 id="delete-question-confirmation-title" class="text-3xl font-bold uppercase">
        {{ t('deleteQuestion') }}
      </h2>
      <p id="delete-question-confirmation-description" class="mt-4">
        {{ t('confirmDeleteQuestion', { key: questionToDelete?.key ?? '' }) }}
      </p>
      <div class="mt-6 flex flex-wrap justify-end gap-2.5">
        <UiButton
          :disabled="isUpdatingQuestionId !== null"
          variant="danger"
          @click="deleteQuestion"
        >
          {{ t('deleteQuestion') }}
        </UiButton>
        <UiButton
          :disabled="isUpdatingQuestionId !== null"
          variant="secondary"
          @click="closeDeleteConfirmationDialog"
        >
          {{ t('cancelEditing') }}
        </UiButton>
      </div>
    </dialog>
  </div>
</template>

<i18n lang="yaml">
en:
  pageTitle: Admin Dashboard
  currentActiveQuestion: Current Active Question
  refreshButton: Refresh
  statusLabel: "Status:"
  locked: Locked
  unlocked: Unlocked
  viewLiveResults: View Live Results
  lockQuestion: Lock Question
  unlockQuestion: Unlock Question
  resetAnswers: Reset Answers
  resettingAnswers: Resetting...
  publishNext: Publish Next
  unpublishButton: Unpublish
  confirmResetAnswers: Delete all submitted answers for current question?
  noActiveQuestion: No active question
  addQuestion: Add Question
  editQuestionTitle: Edit Question
  keyPlaceholder: "Enter a unique key/slug (optional, e.g., 'question-1')"
  questionTextPlaceholder: "Enter question text as JSON, e.g., {'{'} \"en\": \"Hello\", \"de\": \"Hallo\" {'}'}"
  notePlaceholder: "Enter note as JSON (optional), e.g., {'{'} \"en\": \"Note\" {'}'}"
  answerOptions: Answer Options
  removeButton: Remove
  addOptionButton: Add Option
  createQuestion: Create Question
  saveQuestion: Save Question
  cancelEditing: Cancel
  editQuestion: Edit
  allQuestions: All Questions
  questionLifecycle: Question lifecycle
  queuePosition: Queue position
  disabledStatus: Disabled
  activeStatus: Active now
  alreadyAskedStatus: Asked before
  answersLockedStatus: Answers locked
  yes: Yes
  no: No
  publishThisQuestion: Publish
  publishQuestionTitle: Publish Question
  confirmPublishQuestion: "Publish '{key}' as active question?"
  disableQuestion: Disable
  enableQuestion: Enable
  confirmDisableQuestion: "Disable '{key}'? Publish Next will skip it."
  confirmEnableQuestion: "Enable '{key}'? Publish Next can select it again."
  disabledQuestion: "Disabled: skipped by Publish Next."
  deleteQuestion: Delete
  confirmDeleteQuestion: "Delete '{key}' and all submitted answers permanently?"
  moveQuestionUp: Move question up
  moveQuestionDown: Move question down
  optionPlaceholder: "Option {n} JSON"
  emojiPlaceholder: Emoji
de:
  pageTitle: Admin-Dashboard
  currentActiveQuestion: Aktuelle aktive Frage
  refreshButton: Aktualisieren
  statusLabel: "Status:"
  locked: Gesperrt
  unlocked: Entsperrt
  viewLiveResults: Live-Ergebnisse anzeigen
  lockQuestion: Frage sperren
  unlockQuestion: Frage entsperren
  resetAnswers: Antworten zurücksetzen
  resettingAnswers: Antworten werden zurückgesetzt...
  publishNext: Nächste veröffentlichen
  unpublishButton: Veröffentlichung zurückziehen
  confirmResetAnswers: Alle abgegebenen Antworten für aktuelle Frage löschen?
  noActiveQuestion: Keine aktive Frage
  addQuestion: Frage hinzufügen
  editQuestionTitle: Frage bearbeiten
  keyPlaceholder: "Eindeutigen Schlüssel eingeben (optional, z.B. 'frage-1')"
  questionTextPlaceholder: "Fragetext als JSON eingeben, z.B. {'{'} \"en\": \"Hello\", \"de\": \"Hallo\" {'}'}"
  notePlaceholder: "Notiz als JSON eingeben, z.B. {'{'} \"en\": \"Notiz\" {'}'}"
  answerOptions: Antwortoptionen
  removeButton: Entfernen
  addOptionButton: Option hinzufügen
  createQuestion: Frage erstellen
  saveQuestion: Frage speichern
  cancelEditing: Abbrechen
  editQuestion: Bearbeiten
  allQuestions: Alle Fragen
  questionLifecycle: Frage-Lebenszyklus
  queuePosition: Warteschlangenposition
  disabledStatus: Deaktiviert
  activeStatus: Derzeit aktiv
  alreadyAskedStatus: Bereits gestellt
  answersLockedStatus: Antworten gesperrt
  yes: Ja
  no: Nein
  publishThisQuestion: Veröffentlichen
  publishQuestionTitle: Frage veröffentlichen
  confirmPublishQuestion: "'{key}' als aktive Frage veröffentlichen?"
  disableQuestion: Deaktivieren
  enableQuestion: Aktivieren
  confirmDisableQuestion: "'{key}' deaktivieren? Nächste veröffentlichen überspringt die Frage dann."
  confirmEnableQuestion: "'{key}' aktivieren? Nächste veröffentlichen kann die Frage dann wieder auswählen."
  disabledQuestion: "Deaktiviert: Wird bei Nächste veröffentlichen übersprungen."
  deleteQuestion: Löschen
  confirmDeleteQuestion: "'{key}' und alle abgegebenen Antworten dauerhaft löschen?"
  moveQuestionUp: Frage nach oben verschieben
  moveQuestionDown: Frage nach unten verschieben
  optionPlaceholder: "Option {n} als JSON"
  emojiPlaceholder: Emoji
ja:
  pageTitle: 管理ダッシュボード
  currentActiveQuestion: 現在のアクティブな質問
  refreshButton: 更新
  statusLabel: ステータス：
  locked: ロック済み
  unlocked: ロック解除
  viewLiveResults: ライブ結果を表示
  lockQuestion: 質問をロック
  unlockQuestion: 質問のロックを解除
  resetAnswers: 回答をリセット
  resettingAnswers: リセット中...
  publishNext: 次を公開
  unpublishButton: 公開停止
  confirmResetAnswers: 現在の質問の回答を全て削除しますか？
  noActiveQuestion: アクティブな質問はありません
  addQuestion: 質問を追加
  editQuestionTitle: 質問を編集
  keyPlaceholder: "一意のキー/スラグを入力（任意、例：'question-1'）"
  questionTextPlaceholder: "質問テキストをJSONで入力、例：{'{'} \"en\": \"Hello\", \"de\": \"Hallo\" {'}'}"
  notePlaceholder: "ノートをJSONで入力、例：{'{'} \"en\": \"メモ\" {'}'}"
  answerOptions: 回答オプション
  removeButton: 削除
  addOptionButton: オプションを追加
  createQuestion: 質問を作成
  saveQuestion: 質問を保存
  cancelEditing: キャンセル
  editQuestion: 編集
  allQuestions: 全ての質問
  questionLifecycle: 質問の状態
  queuePosition: キュー位置
  disabledStatus: 無効
  activeStatus: 現在アクティブ
  alreadyAskedStatus: 公開済み
  answersLockedStatus: 回答をロック
  yes: はい
  no: いいえ
  publishThisQuestion: 公開
  publishQuestionTitle: 質問を公開
  confirmPublishQuestion: "'{key}' をアクティブな質問として公開しますか？"
  disableQuestion: 無効にする
  enableQuestion: 有効にする
  confirmDisableQuestion: "'{key}' を無効にしますか？次を公開ではスキップされます。"
  confirmEnableQuestion: "'{key}' を有効にしますか？次を公開で再び選択できるようになります。"
  disabledQuestion: 無効：次を公開ではスキップされます。
  deleteQuestion: 削除
  confirmDeleteQuestion: "'{key}' と送信済みの回答をすべて完全に削除しますか？"
  moveQuestionUp: 質問を上へ移動
  moveQuestionDown: 質問を下へ移動
  optionPlaceholder: "選択肢 {n} の JSON"
  emojiPlaceholder: 絵文字
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.section-heading {
  @apply mb-5 border-b-[3px] border-black pb-2.5 text-3xl uppercase;
}

.json-textarea {
  @apply resize-y border-2 border-black bg-white p-3 font-mono text-base;
}
</style>
