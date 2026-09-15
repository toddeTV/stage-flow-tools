<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
  localeSwitcher: true,
})

const { t } = useI18n()
const studioUrl = ref('')

onMounted(() => {
  const currentUrl = new URL(window.location.href)
  const resolvedPort = currentUrl.port || (currentUrl.protocol === 'https:' ? '443' : '80')
  const query = new URLSearchParams({
    host: currentUrl.hostname,
    port: resolvedPort,
  })

  studioUrl.value = `/api/admin/drizzle-studio/app/?${query.toString()}`
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl p-5">
    <AdminBackLink />
    <UiPageTitle>{{ t('title') }}</UiPageTitle>

    <p class="mb-5 text-center text-sm text-gray-600">
      {{ t('description') }}
    </p>

    <div class="mb-5 flex flex-wrap justify-center gap-3">
      <a
        v-if="studioUrl"
        class="block border-[3px] border-black bg-black px-4 py-3 text-sm text-white uppercase
          transition-all duration-200 hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]"
        :href="studioUrl"
        rel="noopener noreferrer"
        target="_blank"
      >
        {{ t('openNewTab') }}
      </a>
    </div>

    <div class="overflow-hidden border-[3px] border-black bg-white">
      <iframe
        v-if="studioUrl"
        class="h-[78vh] w-full bg-white"
        :src="studioUrl"
        :title="t('iframeTitle')"
      />

      <div
        v-else
        class="flex h-[78vh] items-center justify-center text-sm tracking-wide text-gray-500 uppercase"
      >
        {{ t('loading') }}
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  title: Database
  description: Browse and edit the SQLite database through a server-side Drizzle Studio proxy.
  openNewTab: Open in New Tab
  iframeTitle: Drizzle Studio
  loading: Loading Studio
de:
  title: Datenbank
  description: SQLite-Datenbank über einen serverseitigen Drizzle-Studio-Proxy durchsuchen und bearbeiten.
  openNewTab: In neuem Tab öffnen
  iframeTitle: Drizzle Studio
  loading: Studio wird geladen
fr:
  title: Base de données
  description: Consultez et modifiez la base de données SQLite via un proxy Drizzle Studio côté serveur.
  openNewTab: Ouvrir dans un nouvel onglet
  iframeTitle: Drizzle Studio
  loading: Chargement de Studio
ja:
  title: データベース
  description: サーバー側の Drizzle Studio プロキシ経由で SQLite データベースを参照、編集します。
  openNewTab: 新しいタブで開く
  iframeTitle: Drizzle Studio
  loading: Studio を読み込み中
</i18n>
