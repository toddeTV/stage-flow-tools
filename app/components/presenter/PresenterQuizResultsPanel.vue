<script setup lang="ts">
import { computed } from 'vue'
import type { PresenterQuizAnswer } from '~/components/presenter/presenter-quiz'
import { quizMarkdownToPlainText } from '~/utils/render-quiz-markdown.client'

const props = defineProps<{
  answers: PresenterQuizAnswer[]
  isLive: boolean
  isReveal: boolean
  participation: number
  receivedAnswers: number
  totalUsers: number
}>()

const { t } = useI18n()
const totalVotes = computed(() => props.answers.reduce((sum, answer) => sum + answer.count, 0))
const chartGradient = computed(() => {
  if (totalVotes.value <= 0) return 'conic-gradient(#D9E0E8 0deg 360deg)'
  let offset = 0
  const segments = props.answers.filter(answer => answer.count > 0).map((answer) => {
    const start = (offset / totalVotes.value) * 360
    offset += answer.count
    return `${answer.color} ${start}deg ${(offset / totalVotes.value) * 360}deg`
  })
  return `conic-gradient(${segments.join(', ')})`
})
const chartSummary = computed(() => props.answers
  .map(answer => `${quizMarkdownToPlainText(answer.label)}: ${answer.count} (${answer.percent}%)`)
  .join(', '))
</script>

<template>
  <aside class="results-panel">
    <div class="result-card">
      <div class="chart-card-header">
        <span class="eyebrow">{{ t('liveDistribution') }}</span>
        <span class="chart-status">{{ props.isLive ? t('live') : t('syncing') }}</span>
      </div>

      <div class="chart-shell">
        <div
          :aria-label="chartSummary"
          class="chart-donut"
          role="img"
          :style="{ background: chartGradient }"
        >
          <div class="chart-center">
            <strong>{{ props.receivedAnswers }}</strong>
            <span>{{ props.receivedAnswers ? t('votesShort') : t('waiting') }}</span>
          </div>
        </div>
      </div>

      <dl class="stats-grid">
        <div><dt>{{ t('votesReceived') }}</dt><dd>{{ props.receivedAnswers }}</dd></div>
        <div><dt>{{ t('participation') }}</dt><dd>{{ props.participation }}%</dd></div>
        <div><dt>{{ t('audiencePresent') }}</dt><dd>{{ props.totalUsers }}</dd></div>
        <div><dt>{{ t('questionState') }}</dt><dd>{{ props.isReveal ? t('locked') : t('open') }}</dd></div>
      </dl>
    </div>
  </aside>
</template>

<i18n lang="yaml">
en:
  open: Open
  locked: Locked
  votesShort: Votes
  waiting: Waiting
  liveDistribution: Live distribution
  live: Live
  syncing: Syncing
  votesReceived: Votes received
  participation: Participation
  audiencePresent: Audience present
  questionState: Question state
de:
  open: Offen
  locked: Gesperrt
  votesShort: Stimmen
  waiting: Wartet
  liveDistribution: Live-Verteilung
  live: Live
  syncing: Synchronisiert
  votesReceived: Erhaltene Stimmen
  participation: Teilnahme
  audiencePresent: Publikum
  questionState: Fragenstatus
fr:
  open: Ouverte
  locked: Verrouillée
  votesShort: Votes
  waiting: En attente
  liveDistribution: Répartition en direct
  live: En direct
  syncing: Synchronisation
  votesReceived: Votes reçus
  participation: Participation
  audiencePresent: Public présent
  questionState: État de la question
ja:
  open: 受付中
  locked: ロック済み
  votesShort: 票
  waiting: 待機中
  liveDistribution: ライブ分布
  live: ライブ
  syncing: 同期中
  votesReceived: 受信した票
  participation: 参加率
  audiencePresent: 参加者
  questionState: 質問の状態
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.results-panel {
  @apply flex h-full min-h-0 flex-col gap-3;
}

.result-card {
  @apply flex h-full min-h-0 flex-col rounded-[2rem] border px-4 py-4 text-white shadow-sm;
  background: rgb(2 6 23 / var(--presenter-foreground-opacity));
  border-color: var(--presenter-border);
}

.chart-card-header {
  @apply mb-3 flex items-center justify-between gap-3;
}

.eyebrow,
.stats-grid dt {
  @apply font-semibold uppercase tracking-[0.28em];
  color: var(--presenter-muted);
  font-size: .75em;
}

.chart-status {
  @apply rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-bold uppercase tracking-[0.18em];
  @apply text-white/70;
  font-size: .65em;
}

.chart-shell {
  @apply flex justify-center py-2;
}

.chart-donut {
  @apply relative h-44 w-44 rounded-full;
}

.chart-donut::after {
  @apply absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2;
  @apply rounded-full bg-slate-950;
  content: '';
}

.chart-center {
  @apply absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col;
  @apply items-center justify-center text-center;
}

.chart-center strong {
  @apply font-black;
  font-size: 1.65em;
}

.chart-center span {
  @apply font-semibold uppercase tracking-[0.22em] text-white/60;
  font-size: .65em;
}

.stats-grid {
  @apply mt-auto grid grid-cols-2 gap-2.5;
}

.stats-grid div {
  @apply rounded-[1rem] border border-white/10 bg-white/6 px-3 py-2.5;
}

.stats-grid dd {
  @apply mt-1.5 block font-black;
  font-size: 1.125em;
}

.stats-grid dt {
  @apply text-white/55;
}

@container presenter-stage (max-width: 860px) {
  .results-panel {
    @apply min-h-96;
  }
}
</style>
