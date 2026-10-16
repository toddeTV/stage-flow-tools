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
  isPreviewReady: boolean
  questions: Question[]
}>()

const emit = defineEmits<{
  back: []
  confirm: [questionPackage: QuestionPackage]
  packageSelected: [questionPackage: QuestionPackage]
  selectionStarted: []
}>()

const { t } = useI18n()
const { getIssueMessage } = useApiError()
const localError = ref<string>()
const questionPackage = ref<QuestionPackage>()
let selectionRequestId = 0

const preview = computed(() => questionPackage.value
  ? getQuestionPackageImportPreview(questionPackage.value, props.questions)
  : undefined)

const canImport = computed(() => Boolean(questionPackage.value
  && props.isPreviewReady
  && !props.isPreparingPreview
  && !props.isImporting
  && !preview.value?.conflictingKeys.length))

const displayedError = computed(() => localError.value || props.errorMessage)

async function selectQuestionPackage(event: Event) {
  const requestId = ++selectionRequestId
  const input = event.target as HTMLInputElement
  const file = Array.from(input.files || [])[0]

  questionPackage.value = undefined
  localError.value = undefined
  emit('selectionStarted')

  if (!file) {
    return
  }

  let value: unknown

  try {
    value = JSON.parse(await file.text())
  }
  catch {
    if (requestId === selectionRequestId) {
      localError.value = t('errors.validation.invalid_json')
    }
    return
  }

  if (requestId !== selectionRequestId) {
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
  if (!questionPackage.value || !canImport.value) {
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
        :disabled="isImporting"
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
      <p v-if="preview?.conflictingKeys.length" class="mt-3" role="alert">
        {{ t('questionPackageKeyConflict') }}
        <span class="break-all">{{ preview.conflictingKeys.join(', ') }}</span>
      </p>
    </div>

    <div class="flex flex-wrap gap-2.5">
      <UiButton
        :disabled="!canImport"
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
  questionPackageFileHint: Select a Version 2 JSON question package.
  questionPackageImportSummary: Import summary
  questionsToCreate: "{count} questions will be added."
  questionPackageKeyConflict: "Existing question keys prevent the entire import:"
  importQuestions: Import questions
  importingQuestions: Importing questions...
  backToQuestionChoices: Back
de:
  questionPackageFile: Fragenpaket als JSON-Datei
  questionPackageFileHint: Wähle ein JSON-Fragenpaket der Version 2 aus.
  questionPackageImportSummary: Importübersicht
  questionsToCreate: "{count} Fragen werden hinzugefügt."
  questionPackageKeyConflict: "Vorhandene Fragen-Schlüssel verhindern den gesamten Import:"
  importQuestions: Fragen importieren
  importingQuestions: Fragen werden importiert...
  backToQuestionChoices: Zurück
fr:
  questionPackageFile: Fichier JSON du paquet de questions
  questionPackageFileHint: Sélectionnez un paquet de questions JSON Version 2.
  questionPackageImportSummary: Récapitulatif de l'importation
  questionsToCreate: "{count} questions seront ajoutées."
  questionPackageKeyConflict: "Des clés de questions existantes empêchent toute l’importation :"
  importQuestions: Importer les questions
  importingQuestions: Importation des questions...
  backToQuestionChoices: Retour
ja:
  questionPackageFile: 質問パッケージ JSON ファイル
  questionPackageFileHint: バージョン 2 の JSON 質問パッケージを選択してください。
  questionPackageImportSummary: インポート概要
  questionsToCreate: "{count} 件の質問が追加されます。"
  questionPackageKeyConflict: 既存の質問キーがあるため、インポート全体を実行できません：
  importQuestions: 質問をインポート
  importingQuestions: 質問をインポート中...
  backToQuestionChoices: 戻る
</i18n>
