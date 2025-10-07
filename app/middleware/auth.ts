export default defineNuxtRouteMiddleware(async (to, from) => {
  const { error } = await useFetch('/api/auth/verify')
  
  if (error.value) {
    // Validate and sanitize redirect path to prevent open redirect attacks
    let redirectPath = to.fullPath
    
    // Only allow relative paths that start with a single '/'
    // Reject paths that start with '//' (protocol-relative URLs) or contain protocols
    if (!redirectPath ||
        !redirectPath.startsWith('/') ||
        redirectPath.startsWith('//') ||
        redirectPath.includes('://')) {
      redirectPath = '/'
    }
    
    // URL-encode the validated path
    const encodedRedirect = encodeURIComponent(redirectPath)
    
    return navigateTo(`/login?redirect=${encodedRedirect}`)
  }
})