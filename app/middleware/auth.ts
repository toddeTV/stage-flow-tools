export default defineNuxtRouteMiddleware(async (to, from) => {
  const { error } = await useFetch('/api/auth/verify')
  
  if (error.value) {
    return navigateTo(`/login?redirect=${to.fullPath}`)
  }
})