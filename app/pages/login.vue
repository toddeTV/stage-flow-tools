<script setup lang="ts">
import { safeParse } from 'valibot'
import {
  getValidationIssues,
  LoginRequestSchema,
} from '#shared/utils/validation'

const loginForm = ref({ username: '', password: '' })
const loginError = ref('')
const loginFieldErrors = ref<Record<string, string>>({})
const { getErrorMessage, getIssueMessage } = useApiError()

async function handleLogin() {
  loginFieldErrors.value = {}

  const result = safeParse(LoginRequestSchema, loginForm.value)

  if (!result.success) {
    loginFieldErrors.value = Object.fromEntries(
      getValidationIssues(result.issues).map(issue => [
        issue.path[0] || 'form',
        getIssueMessage(issue),
      ]),
    )
    return
  }

  try {
    loginError.value = ''
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: result.output,
    })

    const router = useRouter()
    const route = useRoute()
    const redirect = route.query.redirect
    let redirectPath = '/admin' // Default redirect path

    if (typeof redirect === 'string') {
      // Validate the redirect path to prevent open redirects
      // - Must start with '/'
      // - Must not start with '//'
      // - Must not contain '://'
      if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('://')) {
        redirectPath = redirect
      }
    }

    router.push(redirectPath)
  }
  catch (error: unknown) {
    loginError.value = getErrorMessage(error, 'auth.credentials_invalid')
  }
}
</script>

<template>
  <div class="mx-auto mt-20 max-w-md border-[3px] border-black bg-white p-8">
    <h1 class="mb-5 border-b-[3px] border-black pb-2.5 text-3xl uppercase">
      Admin Login
    </h1>
    <form class="flex flex-col gap-4" @submit.prevent="handleLogin">
      <UiInput
        v-model="loginForm.username"
        :aria-describedby="loginFieldErrors.username ? 'login-username-error' : undefined"
        :aria-invalid="Boolean(loginFieldErrors.username)"
        placeholder="Username"
        required
      />
      <p
        v-if="loginFieldErrors.username"
        id="login-username-error"
        class="text-sm"
        role="alert"
      >
        {{ loginFieldErrors.username }}
      </p>
      <UiInput
        v-model="loginForm.password"
        :aria-describedby="loginFieldErrors.password ? 'login-password-error' : undefined"
        :aria-invalid="Boolean(loginFieldErrors.password)"
        placeholder="Password"
        required
        type="password"
      />
      <p
        v-if="loginFieldErrors.password"
        id="login-password-error"
        class="text-sm"
        role="alert"
      >
        {{ loginFieldErrors.password }}
      </p>
      <UiButton type="submit">
        Login
      </UiButton>
      <div v-if="loginError" class="border-2 border-black bg-white p-2.5 text-center text-black">
        {{ loginError }}
      </div>
    </form>
  </div>
</template>
