<script setup lang="ts">
import { safeParse } from 'valibot'
import type {
  Question,
  QuestionPackage,
} from '~/types'
import {
  getQuestionPackageImportPreview,
} from '~/utils/question-package'
import {
  getValidationIssues,
  QuestionPackageSchema,
} from '#shared/utils/validation'

const props = defineProps<{
  errorMessage?: string
  isImporting: boolean
  isPreparingPreview: boolean
  questions: Question[]
}>()

const emit = defineEmits<{
  back: []
  confirm: [questionPackage: QuestionPackage]
  packageSelected: [questionPackage: QuestionPackage]
}>()

const { t } = useI18n()
const { getIssueMessage } = useApiError()
const localError = ref<string>()
const questionPackage = ref<QuestionPackage>()

const preview = computed(() => questionPackage.value
  ? getQuestionPackageImportPreview(questionPackage.value, props.questions)
  : undefined)

const displayedError = computed(() => localError.value || props.errorMessage)

async function selectQuestionPackage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = Array.from(input.files || [])[0]

  questionPackage.value = undefined
  localError.value = undefined

  if (!file) {
    return
  }

  let value: unknown

  try {
    value = JSON.parse(await file.text())
  }
  catch {
    localError.value = t('errors.validation.invalid_json')
    return
  }

  const result = safeParse(QuestionPackageSchema, value)

  if (!result.success) {
    const issue = getValidationIssues(result.issues)[0]
    localError.value = issue
      ? getIssueMessage(issue)
      : t('errors.validation.invalid_question_package')
    return
  }

  questionPackage.value = result.output as QuestionPackage
  emit('packageSelected', questionPackage.value)
}

function confirmImport() {
  if (!questionPackage.value || props.isPreparingPreview || props.isImporting) {
    return
  }

  emit('confirm', questionPackage.value)
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <label class="text-lg font-bold tracking-wide uppercase" for="question-package-file">
        {{ t('questionPackageFile') }}
      </label>
      <p class="mt-2 text-sm">
        {{ t('questionPackageFileHint') }}
      </p>
      <input
        id="question-package-file"
        accept="application/json,.json"
        class="mt-3 block w-full border-2 border-black bg-white p-3"
        type="file"
        @change="selectQuestionPackage"
      >
    </div>

    <p v-if="displayedError" role="alert">
      {{ displayedError }}
    </p>

    <div v-if="questionPackage" aria-live="polite" class="border-2 border-black bg-gray-100 p-4">
      <h3 class="font-bold uppercase">
        {{ t('questionPackageImportSummary') }}
      </h3>
      <p class="mt-3">
        {{ t('questionsToCreate', { count: preview?.createCount ?? 0 }) }}
      </p>
      <p>
        {{ t('questionsToUpdate', { count: preview?.updateCount ?? 0 }) }}
      </p>
      <p class="mt-3 text-sm">
        {{ t('questionPackageAnswerWarning') }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2.5">
      <UiButton
        :disabled="!questionPackage || isPreparingPreview || isImporting"
        @click="confirmImport"
      >
        {{ isImporting ? t('importingQuestions') : t('importQuestions') }}
      </UiButton>
      <UiButton
        :disabled="isImporting"
        variant="secondary"
        @click="emit('back')"
      >
        {{ t('backToQuestionChoices') }}
      </UiButton>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  questionPackageFile: Question package JSON file
  questionPackageFileHint: Select a Version 1 JSON question package.
  questionPackageImportSummary: Import summary
  questionsToCreate: "{count} questions will be added."
  questionsToUpdate: "{count} existing questions will be updated."
  questionPackageAnswerWarning: Existing answers stay. Changed options can make results inconsistent.
  importQuestions: Import questions
  importingQuestions: Importing questions...
  backToQuestionChoices: Back
de:
  questionPackageFile: Fragenpaket als JSON-Datei
  questionPackageFileHint: Wähle ein JSON-Fragenpaket der Version 1 aus.
  questionPackageImportSummary: Importübersicht
  questionsToCreate: "{count} Fragen werden hinzugefügt."
  questionsToUpdate: "{count} vorhandene Fragen werden aktualisiert."
  questionPackageAnswerWarning: Bestehende Antworten bleiben erhalten. Geänderte Optionen können Ergebnisse verfälschen.
  importQuestions: Fragen importieren
  importingQuestions: Fragen werden importiert...
  backToQuestionChoices: Zurück
ja:
  questionPackageFile: 質問パッケージ JSON ファイル
  questionPackageFileHint: バージョン 1 の JSON 質問パッケージを選択してください。
  questionPackageImportSummary: インポート概要
  questionsToCreate: "{count} 件の質問が追加されます。"
  questionsToUpdate: "{count} 件の既存質問が更新されます。"
  questionPackageAnswerWarning: 既存の回答は保持されます。選択肢を変更すると結果が不整合になる場合があります。
  importQuestions: 質問をインポート
  importingQuestions: 質問をインポート中...
  backToQuestionChoices: 戻る
</i18n>
