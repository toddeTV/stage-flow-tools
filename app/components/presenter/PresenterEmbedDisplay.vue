<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { LocalizedString, Results } from '~/types';
import { parsePresenterParameters } from '~/utils/presenter-parameters';

const route = useRoute();
const parameters = computed(() => parsePresenterParameters(route.query));
const key = computed(() =>
  typeof route.query.questionKey === 'string'
    ? route.query.questionKey.trim()
    : '',
);
const mode = computed(() =>
  route.query.mode === 'status' ? 'status' : 'quiz',
);
const compact = computed(
  () => route.query.compact === 'true' && mode.value === 'status',
);
const results = ref<Results | null>(null);
const failed = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
let stopped = false;
let refreshing = false;
const revealed = computed(
  () =>
    mode.value === 'status' ||
    Boolean(
      results.value?.question.is_locked ||
        (results.value?.question.alreadyPublished &&
          !results.value.question.is_active),
    ),
);
const finished = computed(() => results.value?.results.Finished?.count ?? 0);

function text(value: LocalizedString) {
  const language = parameters.value.language ?? navigator.language;
  return value[language] ?? value[language.split('-')[0]!] ?? value.en;
}

async function refresh() {
  if (refreshing || stopped) return;
  refreshing = true;
  const requestedKey = key.value;
  try {
    if (
      !requestedKey ||
      (route.query.mode !== undefined &&
        ![
          'quiz',
          'status',
        ].includes(String(route.query.mode)))
    )
      throw new Error('Invalid selection');
    const state = await $fetch<Results>('/api/admin/presenter/question-state', {
      query: { key: requestedKey },
    });
    if (
      !stopped &&
      requestedKey === key.value &&
      state.question.key === requestedKey
    ) {
      results.value = state;
      failed.value = false;
    }
  } catch {
    if (!stopped) failed.value = true;
  } finally {
    refreshing = false;
  }
}

onMounted(() => {
  void refresh();
  if (parameters.value.presenterRefresh > 0)
    timer = setInterval(
      () => void refresh(),
      parameters.value.presenterRefresh * 1000,
    );
});
onBeforeUnmount(() => {
  stopped = true;
  if (timer) clearInterval(timer);
});
</script>

<template>
  <main
    class="flex min-h-screen flex-col justify-center"
    :class="[
      parameters.colorMode === 'dark'
        ? 'bg-[#0a0a0b] text-white'
        : 'bg-white text-black',
      compact ? 'gap-2 p-4' : 'gap-6 p-8',
    ]"
  >
    <p v-if="failed" role="status">
      {{
        parameters.language === "de"
          ? "Live-Verbindung fehlt. Letzter Stand bleibt sichtbar."
          : "Live connection unavailable. Showing retained results."
      }}
    </p>
    <template v-if="results && results.question.key === key">
      <h1 class="font-bold" :class="compact ? 'text-lg' : 'text-3xl'">
        <QuizMarkdownText :text="text(results.question.question_text)" />
      </h1>
      <p v-if="mode === 'status'" class="text-5xl font-bold">
        {{ finished }}
        {{ parameters.language === "de" ? "fertig" : "finished" }}
      </p>
      <p class="text-sm">
        {{
          results.question.is_active
            ? results.question.is_locked
              ? "🔒"
              : "●"
            : "○"
        }}
        {{
          results.question.is_active
            ? parameters.language === "de"
              ? "Live"
              : "Live"
            : parameters.language === "de"
              ? "Geschlossen · gespeicherter Stand"
              : "Closed · retained results"
        }}
      </p>
      <ul :class="compact ? 'flex gap-2' : 'space-y-4'">
        <li
          v-for="option in results.question.answer_options"
          :key="option.text.en"
          class="flex items-center justify-between rounded-lg border border-current"
          :class="compact ? 'flex-1 gap-2 p-2 text-sm' : 'gap-6 p-4 text-xl'"
        >
          <span
          ><QuizMarkdownText :text="text(option.text)" />
            <span
              v-if="revealed && mode === 'quiz' && option.emoji === '⭐'"
              aria-label="Correct answer"
            >⭐</span
            ></span
          >
          <strong v-if="revealed">{{
            results.results[option.text.en]?.count ?? 0
          }}</strong>
        </li>
      </ul>
      <p>
        {{ results.totalVotes }}
        {{ parameters.language === "de" ? "Antworten" : "responses" }}
      </p>
      <p v-if="revealed && mode === 'quiz' && results.question.note">
        <QuizMarkdownText :text="text(results.question.note)" />
      </p>
    </template>
    <p v-else role="status">
      {{
        parameters.language === "de"
          ? "Frage wird geladen …"
          : "Loading question …"
      }}
    </p>
  </main>
</template>
