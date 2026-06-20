<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { processCallback, buildUser, saveUserAndNotify } from '../services/auth'

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  const sessionToken = route.query.session_token
  if (!sessionToken) {
    router.replace('/')
    return
  }
  try {
    const sessionData = await processCallback(sessionToken)
    const user = buildUser(sessionData)
    await saveUserAndNotify(user)
    const redirect = sessionStorage.getItem('redirect') || '/create'
    sessionStorage.removeItem('redirect')
    router.replace(redirect)
  } catch {
    router.replace('/')
  }
})
</script>

<template>
  <main class="grid min-h-full place-items-center px-6 py-24">
    <p class="text-[#dedcdc] text-lg">Completing login...</p>
  </main>
</template>
