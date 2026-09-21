import { safeParse } from 'valibot';
import type {
  InputQuestion,
  LocalizedString,
  Question,
  QuestionPackage,
} from '~/types';
import {
  createQuestionPackage,
  stringifyQuestionPackage,
} from '~/utils/question-package';
import {
  getValidationIssues,
  QuestionInputSchema,
} from '#shared/utils/validation';

/** Owns the admin question page's fetch state, editor, imports, and lifecycle actions. */
export function useAdminQuestions() {
  const { t } = useI18n();
  const { getLocalizedText } = useLocalization();

  type QuestionFormOption = {
    text: string;
    emoji?: string;
  };

  type QuestionForm = {
    key: string;
    question_text: string;
    answer_options: QuestionFormOption[];
    note: string;
  };

  type PendingQuestionUpdate = {
    questionId: string;
    questionInput: InputQuestion;
  };

  type QuestionDialogMode = 'choice' | 'import' | 'manual';

  function createDefaultQuestionForm(): QuestionForm {
    return {
      key: '',
      question_text: '{\n  "en": ""\n}',
      answer_options: [
        { text: '{\n  "en": ""\n}', emoji: '' },
        { text: '{\n  "en": ""\n}', emoji: '' },
      ],
      note: '{\n  "en": ""\n}',
    };
  }

  function stringifyLocalizedValue(value?: LocalizedString): string {
    return JSON.stringify(value ?? { en: '' }, null, 2);
  }

  function createQuestionFormFromQuestion(question: Question): QuestionForm {
    return {
      key: question.key,
      question_text: stringifyLocalizedValue(question.question_text),
      answer_options: question.answer_options.map((option) => ({
        text: stringifyLocalizedValue(option.text),
        emoji: option.emoji ?? '',
      })),
      note: stringifyLocalizedValue(question.note),
    };
  }

  function getQueuePosition(question: Question, index: number): number | '-' {
    if (question.is_disabled) {
      return '-';
    }

    return allQuestions.value
      .slice(0, index + 1)
      .filter((item) => !item.is_disabled).length;
  }

  const activeQuestion = ref<Question | null>(null);
  const allQuestions = ref<Question[]>([]);
  const questionDialog = ref<HTMLDialogElement>();
  const answerResetConfirmationDialog = ref<HTMLDialogElement>();
  const publishConfirmationDialog = ref<HTMLDialogElement>();
  const toggleDisabledConfirmationDialog = ref<HTMLDialogElement>();
  const deleteConfirmationDialog = ref<HTMLDialogElement>();
  const clearAllConfirmationDialog = ref<HTMLDialogElement>();
  const exportConfirmationDialog = ref<HTMLDialogElement>();
  const editingQuestionId = ref<string | null>(null);
  const isSavingQuestion = ref(false);
  const isResettingAnswers = ref(false);
  const isUpdatingQuestionId = ref<string | null>(null);
  const isClearingAllQuestions = ref(false);
  const isExportingQuestions = ref(false);
  const isImportingQuestions = ref(false);
  const isPreparingImportPreview = ref(false);
  const isImportPreviewReady = ref(false);
  let importPreviewRequestId = 0;
  const questionForm = ref<QuestionForm>(createDefaultQuestionForm());
  const questionFormErrors = ref<Record<string, string>>({});
  const questionToPublish = ref<Question | null>(null);
  const questionToToggleDisabled = ref<Question | null>(null);
  const questionToDelete = ref<Question | null>(null);
  const pendingQuestionUpdate = ref<PendingQuestionUpdate | null>(null);
  const questionDialogMode = ref<QuestionDialogMode>('choice');
  const clearAllError = ref<string>();
  const exportError = ref<string>();
  const importError = ref<string>();
  const isEditMode = computed(() => editingQuestionId.value !== null);
  const isBatchOperationPending = computed(
    () =>
      isClearingAllQuestions.value ||
      isExportingQuestions.value ||
      isImportingQuestions.value,
  );
  const formTitle = computed(() => {
    if (isEditMode.value) {
      return t('editQuestionTitle');
    }

    return questionDialogMode.value === 'import'
      ? t('importQuestionsTitle')
      : t('addQuestion');
  });
  const submitButtonLabel = computed(() =>
    isEditMode.value ? t('saveQuestion') : t('createQuestion'),
  );
  const { getErrorCode, getErrorMessage, getIssueMessage } = useApiError();

  function resetQuestionEditor() {
    editingQuestionId.value = null;
    questionDialogMode.value = 'choice';
    questionForm.value = createDefaultQuestionForm();
    questionFormErrors.value = {};
    importError.value = undefined;
    isImportPreviewReady.value = false;
    importPreviewRequestId += 1;
  }

  function closeQuestionDialog(force = false) {
    if (
      (isSavingQuestion.value ||
        isImportingQuestions.value ||
        isPreparingImportPreview.value) &&
      !force
    ) {
      return;
    }

    questionDialog.value?.close();
  }

  function openQuestionDialog() {
    if (isBatchOperationPending.value) {
      return;
    }

    resetQuestionEditor();
    questionDialog.value?.showModal();
  }

  function startEditingQuestion(question: Question) {
    if (isBatchOperationPending.value) {
      return;
    }

    editingQuestionId.value = question.id;
    questionDialogMode.value = 'manual';
    questionForm.value = createQuestionFormFromQuestion(question);
    questionFormErrors.value = {};
    questionDialog.value?.showModal();
  }

  function selectManualQuestionCreation() {
    questionDialogMode.value = 'manual';
  }

  function returnToQuestionChoices() {
    questionDialogMode.value = 'choice';
    importError.value = undefined;
    isPreparingImportPreview.value = false;
    isImportPreviewReady.value = false;
    importPreviewRequestId += 1;
  }

  function parseQuestionFormPayload(): InputQuestion | undefined {
    questionFormErrors.value = {};
    let hasJsonError = false;

    function parseJsonValue(value: string, path: string): unknown {
      try {
        return JSON.parse(value);
      } catch {
        hasJsonError = true;
        questionFormErrors.value[path] = getIssueMessage({
          code: 'validation.invalid_json',
          path: [
            path,
          ],
        });
        return undefined;
      }
    }

    const questionText = parseJsonValue(
      questionForm.value.question_text,
      'question_text',
    );
    const answerOptions = questionForm.value.answer_options.map(
      (option, index) => ({
        text: parseJsonValue(option.text, `answer_options.${index}.text`),
        emoji: option.emoji,
      }),
    );
    const parsedNote = questionForm.value.note.trim()
      ? parseJsonValue(questionForm.value.note, 'note')
      : undefined;

    if (hasJsonError) {
      return undefined;
    }

    const result = safeParse(QuestionInputSchema, {
      key: questionForm.value.key,
      question_text: questionText,
      answer_options: answerOptions,
      note: parsedNote,
    });

    if (!result.success) {
      for (const issue of getValidationIssues(result.issues)) {
        const path = issue.path.join('.') || 'form';
        questionFormErrors.value[path] ??= getIssueMessage(issue);
      }

      return undefined;
    }

    return result.output as InputQuestion;
  }

  const {
    data: fetchedQuestions,
    error: fetchError,
    refresh: loadQuestions,
  } = useFetch<Question[]>('/api/questions');

  watch(fetchedQuestions, (newQuestions) => {
    if (newQuestions && Array.isArray(newQuestions)) {
      allQuestions.value = newQuestions;
      activeQuestion.value =
        newQuestions.find((question) => question.is_active) || null;

      if (editingQuestionId.value) {
        const editedQuestion = allQuestions.value.find(
          (question) => question.id === editingQuestionId.value,
        );

        if (!editedQuestion) {
          closeQuestionDialog();
        }
      }
    } else {
      allQuestions.value = [];
      activeQuestion.value = null;
    }
  });

  watch(fetchError, (newError) => {
    if (newError) {
      logger_error('Failed to load questions:', newError);
      activeQuestion.value = null;
    }
  });

  async function handleSaveQuestion() {
    const payload = parseQuestionFormPayload();

    if (!payload) {
      return;
    }

    isSavingQuestion.value = true;

    try {
      if (editingQuestionId.value) {
        await $fetch<Question>('/api/questions/update', {
          method: 'POST',
          body: {
            questionId: editingQuestionId.value,
            ...payload,
          },
        });
      } else {
        await $fetch<Question>('/api/questions/create', {
          method: 'POST',
          body: payload,
        });
      }

      await loadQuestions();
      closeQuestionDialog(true);
    } catch (error: unknown) {
      if (
        editingQuestionId.value &&
        getErrorCode(error) === 'quiz.question_answers_reset_required'
      ) {
        pendingQuestionUpdate.value = {
          questionId: editingQuestionId.value,
          questionInput: payload,
        };
        answerResetConfirmationDialog.value?.showModal();
        return;
      }

      alert(getErrorMessage(error));
    } finally {
      isSavingQuestion.value = false;
    }
  }

  function closeAnswerResetConfirmationDialog() {
    answerResetConfirmationDialog.value?.close();
  }

  function resetAnswerResetConfirmationDialog() {
    pendingQuestionUpdate.value = null;
  }

  async function resetAnswersAndSaveQuestion() {
    const pendingUpdate = pendingQuestionUpdate.value;

    if (!pendingUpdate || isSavingQuestion.value) {
      return;
    }

    isSavingQuestion.value = true;

    try {
      await $fetch<Question>('/api/questions/update', {
        method: 'POST',
        body: {
          questionId: pendingUpdate.questionId,
          resetAnswers: true,
          ...pendingUpdate.questionInput,
        },
      });
      await loadQuestions();
      closeAnswerResetConfirmationDialog();
      closeQuestionDialog(true);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      isSavingQuestion.value = false;
    }
  }

  function requestQuestionPublication(question: Question) {
    if (isUpdatingQuestionId.value) {
      return;
    }

    questionToPublish.value = question;
    publishConfirmationDialog.value?.showModal();
  }

  function closePublishConfirmationDialog() {
    publishConfirmationDialog.value?.close();
  }

  function resetPublishConfirmationDialog() {
    questionToPublish.value = null;
  }

  async function publishQuestion() {
    const questionToPublishValue = questionToPublish.value;

    if (!questionToPublishValue || isUpdatingQuestionId.value) {
      return;
    }

    isUpdatingQuestionId.value = questionToPublishValue.id;

    try {
      const question = await $fetch<Question>('/api/questions/publish', {
        method: 'POST',
        body: { key: questionToPublishValue.key },
      });

      activeQuestion.value = question;
      await loadQuestions();
      closePublishConfirmationDialog();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      isUpdatingQuestionId.value = null;
    }
  }

  async function moveQuestion(question: Question, direction: 'up' | 'down') {
    if (isUpdatingQuestionId.value) {
      return;
    }

    isUpdatingQuestionId.value = question.id;

    try {
      await $fetch<Question>('/api/questions/move', {
        method: 'POST',
        body: {
          direction,
          questionId: question.id,
        },
      });
      await loadQuestions();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      isUpdatingQuestionId.value = null;
    }
  }

  function requestQuestionDisabledToggle(question: Question) {
    if (isUpdatingQuestionId.value) {
      return;
    }

    questionToToggleDisabled.value = question;
    toggleDisabledConfirmationDialog.value?.showModal();
  }

  function closeToggleDisabledConfirmationDialog() {
    toggleDisabledConfirmationDialog.value?.close();
  }

  function resetToggleDisabledConfirmationDialog() {
    questionToToggleDisabled.value = null;
  }

  async function toggleQuestionDisabled() {
    const questionToToggleDisabledValue = questionToToggleDisabled.value;

    if (!questionToToggleDisabledValue || isUpdatingQuestionId.value) {
      return;
    }

    isUpdatingQuestionId.value = questionToToggleDisabledValue.id;

    try {
      await $fetch<Question>('/api/questions/toggle-disabled', {
        method: 'POST',
        body: { questionId: questionToToggleDisabledValue.id },
      });
      await loadQuestions();
      closeToggleDisabledConfirmationDialog();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      isUpdatingQuestionId.value = null;
    }
  }

  function requestQuestionDeletion(question: Question) {
    if (isUpdatingQuestionId.value) {
      return;
    }

    questionToDelete.value = question;
    deleteConfirmationDialog.value?.showModal();
  }

  function closeDeleteConfirmationDialog() {
    deleteConfirmationDialog.value?.close();
  }

  function resetDeleteConfirmationDialog() {
    questionToDelete.value = null;
  }

  async function deleteQuestion() {
    const questionToDeleteValue = questionToDelete.value;

    if (!questionToDeleteValue || isUpdatingQuestionId.value) {
      return;
    }

    isUpdatingQuestionId.value = questionToDeleteValue.id;

    try {
      await $fetch('/api/questions/delete', {
        method: 'POST',
        body: { questionId: questionToDeleteValue.id },
      });
      await loadQuestions();
      closeDeleteConfirmationDialog();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      isUpdatingQuestionId.value = null;
    }
  }

  async function fetchQuestionsForImportPreview(): Promise<Question[]> {
    return $fetch<Question[]>('/api/questions');
  }

  async function handleQuestionPackageSelected(
    _questionPackage: QuestionPackage,
  ) {
    const requestId = ++importPreviewRequestId;
    importError.value = undefined;
    isImportPreviewReady.value = false;
    isPreparingImportPreview.value = true;

    try {
      const latestQuestions = await fetchQuestionsForImportPreview();

      if (requestId === importPreviewRequestId) {
        allQuestions.value = latestQuestions;
        activeQuestion.value =
          latestQuestions.find((question) => question.is_active) || null;
        isImportPreviewReady.value = true;
      }
    } catch (error: unknown) {
      if (requestId === importPreviewRequestId) {
        importError.value = getErrorMessage(error);
      }
    } finally {
      if (requestId === importPreviewRequestId) {
        isPreparingImportPreview.value = false;
      }
    }
  }

  async function importQuestionPackage(questionPackage: QuestionPackage) {
    if (
      !isImportPreviewReady.value ||
      isImportingQuestions.value ||
      isPreparingImportPreview.value
    ) {
      return;
    }

    importError.value = undefined;
    isImportingQuestions.value = true;

    try {
      await $fetch('/api/questions/import', {
        method: 'POST',
        body: questionPackage,
      });
      await loadQuestions();
      closeQuestionDialog(true);
    } catch (error: unknown) {
      importError.value = getErrorMessage(error);
    } finally {
      isImportingQuestions.value = false;
    }
  }

  function requestClearAllQuestions() {
    if (allQuestions.value.length === 0 || isBatchOperationPending.value) {
      return;
    }

    clearAllError.value = undefined;
    clearAllConfirmationDialog.value?.showModal();
  }

  function closeClearAllConfirmationDialog() {
    if (!isClearingAllQuestions.value) {
      clearAllConfirmationDialog.value?.close();
    }
  }

  function resetClearAllConfirmationDialog() {
    clearAllError.value = undefined;
  }

  async function clearAllQuestions() {
    if (isClearingAllQuestions.value) {
      return;
    }

    clearAllError.value = undefined;
    isClearingAllQuestions.value = true;

    try {
      await $fetch('/api/questions/delete-all', {
        method: 'POST',
      });
      await loadQuestions();
      clearAllConfirmationDialog.value?.close();
    } catch (error: unknown) {
      clearAllError.value = getErrorMessage(error);
    } finally {
      isClearingAllQuestions.value = false;
    }
  }

  function requestQuestionsExport() {
    if (allQuestions.value.length === 0 || isBatchOperationPending.value) {
      return;
    }

    exportError.value = undefined;
    exportConfirmationDialog.value?.showModal();
  }

  function closeExportConfirmationDialog() {
    if (!isExportingQuestions.value) {
      exportConfirmationDialog.value?.close();
    }
  }

  function resetExportConfirmationDialog() {
    exportError.value = undefined;
  }

  async function exportQuestions() {
    if (isExportingQuestions.value) {
      return;
    }

    exportError.value = undefined;
    isExportingQuestions.value = true;

    try {
      const questions = await $fetch<Question[]>('/api/questions');

      if (questions.length === 0) {
        exportError.value = t('noQuestionsToExport');
        return;
      }

      const downloadUrl = URL.createObjectURL(
        new Blob([
          stringifyQuestionPackage(createQuestionPackage(questions)),
        ], {
          type: 'application/json;charset=utf-8',
        }),
      );
      const downloadLink = document.createElement('a');
      const timestamp = new Date()
        .toISOString()
        .replaceAll(':', '-')
        .replaceAll('.', '-');

      downloadLink.href = downloadUrl;
      downloadLink.download = `stage-flow-tools-questions-${timestamp}.json`;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(downloadUrl);

      exportConfirmationDialog.value?.close();
    } catch (error: unknown) {
      exportError.value = getErrorMessage(error);
    } finally {
      isExportingQuestions.value = false;
    }
  }

  async function toggleLock() {
    if (!activeQuestion.value) return;

    try {
      const question = await $fetch<Question>('/api/questions/toggle-lock', {
        method: 'POST',
        body: { questionId: activeQuestion.value.id },
      });

      activeQuestion.value = question;
    } catch (error: unknown) {
      logger_error('Failed to toggle lock status from results page', error);
      alert(getErrorMessage(error));
    }
  }

  async function unpublishActiveQuestion() {
    try {
      await $fetch('/api/questions/unpublish-active', {
        method: 'POST',
      });
      activeQuestion.value = null;
      await loadQuestions();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  }

  async function publishNextQuestion() {
    try {
      const question = await $fetch<Question>('/api/questions/publish-next', {
        method: 'POST',
      });
      activeQuestion.value = question;
      await loadQuestions();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  }

  async function resetAnswers() {
    if (!activeQuestion.value || isResettingAnswers.value) {
      return;
    }

    if (!window.confirm(t('confirmResetAnswers'))) {
      return;
    }

    isResettingAnswers.value = true;

    try {
      await $fetch('/api/answers/reset', {
        method: 'POST',
      });

      await loadQuestions();
    } catch (error: unknown) {
      logger_error('Failed to reset answers from questions page', error);
      alert(getErrorMessage(error));
    } finally {
      isResettingAnswers.value = false;
    }
  }

  function addOption() {
    questionForm.value.answer_options.push({
      text: '{\n  "en": ""\n}',
      emoji: '',
    });
  }

  function removeOption(index: number) {
    questionForm.value.answer_options.splice(index, 1);
  }

  return {
    activeQuestion,
    addOption,
    allQuestions,
    answerResetConfirmationDialog,
    clearAllConfirmationDialog,
    clearAllError,
    clearAllQuestions,
    closeAnswerResetConfirmationDialog,
    closeClearAllConfirmationDialog,
    closeDeleteConfirmationDialog,
    closeExportConfirmationDialog,
    closePublishConfirmationDialog,
    closeQuestionDialog,
    closeToggleDisabledConfirmationDialog,
    createQuestionFormFromQuestion,
    deleteConfirmationDialog,
    deleteQuestion,
    editingQuestionId,
    exportConfirmationDialog,
    exportError,
    exportQuestions,
    formTitle,
    getLocalizedText,
    getQueuePosition,
    handleQuestionPackageSelected,
    handleSaveQuestion,
    importError,
    importQuestionPackage,
    isBatchOperationPending,
    isClearingAllQuestions,
    isEditMode,
    isExportingQuestions,
    isImportingQuestions,
    isPreparingImportPreview,
    isImportPreviewReady,
    isResettingAnswers,
    isSavingQuestion,
    isUpdatingQuestionId,
    loadQuestions,
    moveQuestion,
    openQuestionDialog,
    pendingQuestionUpdate,
    publishConfirmationDialog,
    publishNextQuestion,
    publishQuestion,
    questionDialog,
    questionDialogMode,
    questionForm,
    questionFormErrors,
    questionToDelete,
    questionToPublish,
    questionToToggleDisabled,
    removeOption,
    requestClearAllQuestions,
    requestQuestionDeletion,
    requestQuestionDisabledToggle,
    requestQuestionPublication,
    requestQuestionsExport,
    resetAnswerResetConfirmationDialog,
    resetAnswers,
    resetAnswersAndSaveQuestion,
    resetClearAllConfirmationDialog,
    resetDeleteConfirmationDialog,
    resetExportConfirmationDialog,
    resetPublishConfirmationDialog,
    resetQuestionEditor,
    resetToggleDisabledConfirmationDialog,
    returnToQuestionChoices,
    selectManualQuestionCreation,
    startEditingQuestion,
    submitButtonLabel,
    t,
    toggleDisabledConfirmationDialog,
    toggleLock,
    toggleQuestionDisabled,
    unpublishActiveQuestion,
  };
}
