<script setup lang="ts">
const loginForm = ref({ username: '', password: '' })
const loginError = ref('')

async function handleLogin() {
  try {
    loginError.value = ''
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: loginForm.value
    })

    const router = useRouter()
    const route = useRoute()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    router.push(redirect)
  }
  catch (error: any) {
    loginError.value = error.data?.statusMessage || 'Login failed'
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-20 p-8 border-[3px] border-black bg-white">
    <h1 class="mb-5 text-3xl uppercase border-b-[3px] border-black pb-2.5">Admin Login</h1>
    <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
      <UiInput v-model="loginForm.username" placeholder="Username" required />
      <UiInput v-model="loginForm.password" type="password" placeholder="Password" required />
      <UiButton type="submit">Login</UiButton>
      <div v-if="loginError" class="text-black bg-white border-2 border-black p-2.5 text-center">{{ loginError }}</div>
    </form>
  </div>
</template>