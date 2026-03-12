<script setup lang="ts">
const loginForm = ref({ username: '', password: '' })
const loginError = ref('')

async function handleLogin() {
  try {
    loginError.value = ''
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: loginForm.value,
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
    const fetchError = error as { data?: { statusMessage?: string } }
    loginError.value = fetchError.data?.statusMessage || 'Login failed'
  }
}
</script>

<template>
  <div class="mx-auto mt-20 max-w-md border-[3px] border-black bg-white p-8">
    <h1 class="mb-5 border-b-[3px] border-black pb-2.5 text-3xl uppercase">
      Admin Login
    </h1>
    <form class="flex flex-col gap-4" @submit.prevent="handleLogin">
      <UiInput v-model="loginForm.username" placeholder="Username" required />
      <UiInput
        v-model="loginForm.password"
        placeholder="Password"
        required
        type="password"
      />
      <UiButton type="submit">
        Login
      </UiButton>
      <div v-if="loginError" class="border-2 border-black bg-white p-2.5 text-center text-black">
        {{ loginError }}
      </div>
    </form>
  </div>
</template>
