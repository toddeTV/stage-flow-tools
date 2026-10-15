/** Carries the selected content language through internal navigation. */
export default defineNuxtRouteMiddleware((to) => {
  const language = useState<string>('question-language', () => '')
  if (!language.value || 'language' in to.query) return
  return navigateTo({
    path: to.path,
    query: { ...to.query, language: language.value },
    hash: to.hash,
  }, { replace: true })
})
