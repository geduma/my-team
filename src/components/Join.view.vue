<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentUser, getEventByHash, saveEvent } from '../services/db'
import { createGuestUser, setGuestDisplayName } from '../services/auth'

const route = useRoute()
const router = useRouter()

const event = ref(null)
const currentUser = ref(null)
const loading = ref(true)
const joined = ref(false)
const error = ref('')
const joining = ref(false)
const displayName = ref('')
const nameError = ref('')

const needsName = computed(() => {
  return currentUser.value && !currentUser.value.displayName
})

onMounted(async () => {
  let user = await getCurrentUser()
  if (!user) {
    user = await createGuestUser()
  }
  currentUser.value = user
  if (user?.provider !== 'guest' || !user.displayName) {
    displayName.value = user?.displayName || ''
  } else {
    displayName.value = user.displayName
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
    joined.value = found.players.some(p => p.id === currentUser.value.googleId)
  } catch (e) {
    error.value = 'Error loading event'
  } finally {
    loading.value = false
  }
}

function validateName () {
  if (!displayName.value.trim()) {
    nameError.value = 'Name is required'
    return false
  }
  if (event.value && event.value.players.some(p =>
    p.displayName?.toLowerCase() === displayName.value.trim().toLowerCase()
  )) {
    nameError.value = 'Name already taken in this event'
    return false
  }
  return true
}

async function handleJoin () {
  if (!event.value) return
  if (!validateName()) return

  const name = displayName.value.trim()
  if (currentUser.value.provider === 'guest') {
    await setGuestDisplayName(name)
  }

  joining.value = true
  const updated = { ...event.value }
  updated.players.push({
    id: currentUser.value.googleId,
    displayName: name,
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

        <div v-if="!joined" class="mt-8 space-y-4">
          <div>
            <label class="sr-only" for="join-name">Your name</label>
            <input
              id="join-name"
              v-model="displayName"
              class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
              :placeholder="needsName ? 'Enter your name' : 'Your name'"
            />
            <p v-if="nameError" class="mt-2 text-red-400 text-sm">{{ nameError }}</p>
          </div>
          <button
            class="w-full rounded-md bg-[#64e34f] px-6 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90 disabled:opacity-50"
            :disabled="joining || !displayName.trim()"
            @click="handleJoin"
          >
            {{ joining ? 'Joining...' : 'Join match' }}
          </button>
        </div>

        <div v-else class="mt-8">
          <p class="text-[#64e34f] text-lg font-semibold">You're in! ✅</p>
        </div>
      </div>
    </div>
  </div>
</template>
