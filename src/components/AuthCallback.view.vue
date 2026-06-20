<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { processCallback, buildUser, saveUserAndNotify } from '../services/auth'

const router = useRouter()
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const sessionToken = params.get('session_token')

  if (!sessionToken) {
    error.value = 'No session token received. The login link may be invalid or expired.'
    loading.value = false
    return
  }

  try {
    const sessionData = await processCallback(sessionToken)
    const user = buildUser(sessionData)
    await saveUserAndNotify(user)
    const redirect = sessionStorage.getItem('redirect') || '/create'
    sessionStorage.removeItem('redirect')
    router.replace(redirect)
  } catch (e) {
    if (e.name === 'AbortError') {
      error.value = 'Request timed out. The authentication server is not responding. Please try again.'
    } else {
      error.value = e.message || 'An unexpected error occurred. Please try again.'
    }
    loading.value = false
  }
})

function goHome () {
  router.replace('/')
}
</script>

<template>
  <main class="grid min-h-full place-items-center px-6 py-24">
    <div v-if="loading" class="flex flex-col items-center gap-4">
      <svg class="animate-spin h-8 w-8 text-[#0b88de]" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p class="text-[#dedcdc] text-lg">Completing login...</p>
    </div>
    <div v-else class="flex flex-col items-center gap-4">
      <p class="text-red-400 text-lg text-center max-w-md">{{ error }}</p>
      <button
        class="rounded-md bg-[#0b88de] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3]"
        @click="goHome"
      >Go to Home</button>
    </div>
  </main>
</template>
