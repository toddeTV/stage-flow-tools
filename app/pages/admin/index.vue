<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
  localeSwitcher: true,
})

const { t } = useI18n()

const subPages = computed(() => [
  { path: '/admin/questions', label: t('questions'), description: t('questionsDesc') },
  { path: '/admin/presenter', label: t('presenter'), description: t('presenterDesc') },
  { path: '/admin/results', label: t('results'), description: t('resultsDesc') },
  { path: '/admin/leaderboard', label: t('leaderboard'), description: t('leaderboardDesc') },
  { path: '/admin/recap', label: t('recap'), description: t('recapDesc') },
  { path: '/admin/emojis', label: t('emojis'), description: t('emojisDesc') },
  { path: '/admin/database', label: t('database'), description: t('databaseDesc') },
])

const logoutError = ref(false)

/** Log the admin out and redirect to login. */
async function handleLogout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    navigateTo('/login')
  }
  catch (error: unknown) {
    logger_error('Logout failed', error)
    logoutError.value = true
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-5">
    <UiPageTitle>{{ t('title') }}</UiPageTitle>

    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
      <NuxtLink
        v-for="page in subPages"
        :key="page.path"
        class="block border-[3px] border-black bg-white p-5 transition-all duration-200
          hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]"
        :to="page.path"
      >
        <h2 class="mb-2 text-2xl tracking-wide uppercase">
          {{ page.label }}
        </h2>
        <p class="text-sm text-gray-500">
          {{ page.description }}
        </p>
      </NuxtLink>
    </div>

    <div class="mt-8">
      <UiButton variant="secondary" @click="handleLogout">
        {{ t('logout') }}
      </UiButton>
      <p v-if="logoutError" class="mt-2 text-sm text-red-600">
        {{ t('logoutError') }}
      </p>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  title: Admin
  questions: Questions
  questionsDesc: Create, publish, and manage quiz questions.
  presenter: Presenter Quiz
  presenterDesc: Run the complete quiz sequence in a presentation-ready frame.
  results: Live Results
  resultsDesc: View real-time voting results with animated bars.
  leaderboard: Leaderboard
  leaderboardDesc: Aggregated player scores across all published questions.
  recap: Quiz Recap
  recapDesc: Show memorable quiz statistics after the game.
  emojis: Emoji Overlay
  emojisDesc: Floating emoji reactions overlay for presentations.
  database: Database
  databaseDesc: Open Drizzle Studio in a protected admin frame.
  logout: Logout
  logoutError: Logout failed. Please try again.
de:
  title: Admin
  questions: Fragen
  questionsDesc: Quiz-Fragen erstellen, veröffentlichen und verwalten.
  presenter: Presenter-Quiz
  presenterDesc: Den vollständigen Quiz-Ablauf in einer präsentationsfertigen Ansicht steuern.
  results: Live-Ergebnisse
  resultsDesc: Echtzeit-Abstimmungsergebnisse mit animierten Balken anzeigen.
  leaderboard: Bestenliste
  leaderboardDesc: Gesammelte Spielerpunktzahlen aller veröffentlichten Fragen.
  recap: Quiz-Rückblick
  recapDesc: Prägnante Quiz-Statistiken nach dem Spiel zeigen.
  emojis: Emoji-Overlay
  emojisDesc: Schwebende Emoji-Reaktionen als Overlay für Präsentationen.
  database: Datenbank
  databaseDesc: Drizzle Studio in einem geschützten Admin-Frame öffnen.
  logout: Abmelden
  logoutError: Abmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.
fr:
  title: Administration
  questions: Questions
  questionsDesc: Créez, publiez et gérez les questions du quiz.
  presenter: Quiz de présentation
  presenterDesc: Lancez le quiz complet dans un cadre prêt pour la présentation.
  results: Résultats en direct
  resultsDesc: Consultez les résultats des votes en temps réel avec des barres animées.
  leaderboard: Classement
  leaderboardDesc: Scores cumulés des joueurs pour toutes les questions publiées.
  recap: Récapitulatif du quiz
  recapDesc: Affichez les statistiques marquantes du quiz après la partie.
  emojis: Superposition d'emojis
  emojisDesc: Superposition de réactions emoji flottantes pour les présentations.
  database: Base de données
  databaseDesc: Ouvrez Drizzle Studio dans un cadre d'administration protégé.
  logout: Déconnexion
  logoutError: Échec de la déconnexion. Réessayez.
ja:
  title: 管理
  questions: 質問
  questionsDesc: クイズの質問を作成、公開、管理します。
  presenter: プレゼンタークイズ
  presenterDesc: プレゼンテーション用画面でクイズ全体を進行します。
  results: ライブ結果
  resultsDesc: アニメーションバー付きのリアルタイム投票結果を表示します。
  leaderboard: リーダーボード
  leaderboardDesc: 公開された全質問の累計プレイヤースコア。
  recap: クイズの振り返り
  recapDesc: クイズ終了後に印象的な統計を表示します。
  emojis: 絵文字オーバーレイ
  emojisDesc: プレゼンテーション用の浮遊する絵文字リアクションオーバーレイ。
  database: データベース
  databaseDesc: 保護された管理フレームで Drizzle Studio を開きます。
  logout: ログアウト
  logoutError: ログアウトに失敗しました。もう一度お試しください。
</i18n>
