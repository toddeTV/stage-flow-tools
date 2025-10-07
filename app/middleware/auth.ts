export default defineNuxtRouteMiddleware(async (to, from) => {
  const timeout = 15000 // 15 seconds
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const { error, status } = await useFetch('/api/auth/verify', {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Check for any fetch errors or non-successful status codes
    if (error.value || status.value !== 'success') {
      throw new Error('Auth verification failed')
    }
  }
  catch (err) {
    // In case of any error (network, timeout, non-2xx), redirect to login
    // Validate and sanitize redirect path to prevent open redirect attacks
    let redirectPath = to.fullPath

    // Only allow relative paths that start with a single '/'
    // Reject paths that start with '//' (protocol-relative URLs) or contain protocols
    if (
      !redirectPath
      || !redirectPath.startsWith('/')
      || redirectPath.startsWith('//')
      || redirectPath.includes('://')
    ) {
      redirectPath = '/'
    }

    // URL-encode the validated path
    const encodedRedirect = encodeURIComponent(redirectPath)

    return navigateTo(`/login?redirect=${encodedRedirect}`)
  }
})