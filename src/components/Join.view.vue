<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentUser, getEventByHash, saveEvent } from '../services/db'

const route = useRoute()
const router = useRouter()

const event = ref(null)
const currentUser = ref(null)
const loading = ref(true)
const joined = ref(false)
const error = ref('')

onMounted(async () => {
  currentUser.value = await getCurrentUser()
  if (!currentUser.value) {
    router.push('/')
    return
  }
  await loadEvent()
})

async function loadEvent () {
  loading.value = true
  error.value = ''
  try {
    const found = await getEventByHash(route.params.hash)
    if (!found) {
      error.value = 'Event not found'
      return
    }
    event.value = found
    joined.value = found.players.some(p => p.id === currentUser.value.id)
  } catch (e) {
    error.value = 'Error loading event'
  } finally {
    loading.value = false
  }
}

async function handleJoin () {
  if (!event.value) return
  const updated = { ...event.value }
  updated.players.push({
    id: currentUser.value.id,
    displayName: currentUser.value.displayName,
    photoURL: currentUser.value.photoURL,
    team: null
  })
  await saveEvent(updated)
  joined.value = true
  router.push(`/match/${event.value.id}`)
}
</script>

<template>
  <div class="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-lg bg-[#00000096] p-10 rounded-lg">
      <div v-if="loading" class="text-center text-[#dedcdc]">Loading...</div>

      <div v-else-if="error" class="text-center">
        <p class="text-red-400 text-lg">{{ error }}</p>
        <router-link to="/" class="mt-4 inline-block text-[#0b88de] hover:underline">Go home</router-link>
      </div>

      <div v-else-if="event" class="text-center">
        <h1 class="text-2xl font-bold text-white">{{ event.title }}</h1>
        <div class="mt-6 space-y-3 text-[#dedcdc]">
          <p>📅 {{ event.date }} at {{ event.time }}</p>
          <p>📍 {{ event.location }}</p>
          <p v-if="event.description">{{ event.description }}</p>
          <p>Players: {{ event.players.length }} / {{ event.maxPlayers }}</p>
        </div>

        <div class="mt-8">
          <div v-if="joined" class="text-[#64e34f] text-lg font-semibold">
            You're in! ✅
          </div>
          <button
            v-else
            class="rounded-md bg-[#64e34f] px-6 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90"
            @click="handleJoin"
          >
            Join match
          </button>
        </div>

        <div class="mt-6">
          <router-link
            :to="`/match/${event.id}`"
            class="text-[#0b88de] hover:underline text-sm"
          >View match details</router-link>
        </div>
      </div>
    </div>
  </div>
</template>
