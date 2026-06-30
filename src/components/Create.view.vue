<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser, saveEvent } from '../services/db'
import { isGoogleUser } from '../services/auth'

const router = useRouter()

const title = ref('')
const date = ref('')
const time = ref('')
const location = ref('')
const description = ref('')
const submitting = ref(false)
const error = ref('')
const currentUser = ref(null)

onMounted(async () => {
  currentUser.value = await getCurrentUser()
  if (!currentUser.value || !isGoogleUser(currentUser.value)) {
    router.push('/')
  }
})

async function handleSubmit () {
  error.value = ''
  if (!title.value || !date.value || !time.value || !location.value) {
    error.value = 'Please fill in all required fields'
    return
  }
  submitting.value = true
  try {
    const event = {
      ownerId: currentUser.value.googleId,
      title: title.value,
      date: date.value,
      time: time.value,
      location: location.value,
      type: 'match',
      maxPlayers: 22,
      description: description.value,
      players: [{
        id: currentUser.value.googleId,
        displayName: currentUser.value.displayName,
        photoURL: currentUser.value.photoURL,
        team: null
      }]
    }
    const saved = await saveEvent(event)
    router.push(`/match/${saved.id}`)
  } catch (e) {
    error.value = 'Error saving event'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-lg bg-[#00000096] p-10 rounded-lg">
      <h1 class="text-center text-2xl font-bold text-[#dedcdc] sm:text-3xl">
        Create a new match
      </h1>

      <form class="mb-0 mt-6 space-y-4 rounded-lg p-4 shadow-lg sm:p-6 lg:p-8" @submit.prevent="handleSubmit">
        <div>
          <label class="sr-only" for="title">Match title</label>
          <input
            id="title"
            v-model="title"
            class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
            placeholder="Match title"
            required
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="sr-only" for="date">Date</label>
            <input
              id="date"
              v-model="date"
              type="date"
              class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
              required
            />
          </div>
          <div>
            <label class="sr-only" for="time">Time</label>
            <input
              id="time"
              v-model="time"
              type="time"
              class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
              required
            />
          </div>
        </div>

        <div>
          <label class="sr-only" for="location">Location</label>
          <input
            id="location"
            v-model="location"
            class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
            placeholder="Location"
            required
          />
        </div>

        <div>
          <label class="sr-only" for="description">Description (optional)</label>
          <textarea
            id="description"
            v-model="description"
            class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
            placeholder="Description (optional)"
            rows="3"
          ></textarea>
        </div>

        <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>

        <button
          type="submit"
          class="block w-full rounded-lg bg-[#0b88de] px-5 py-3 text-sm font-medium text-white hover:bg-[#50b1f3]"
          :disabled="submitting"
        >
          {{ submitting ? 'Creating...' : 'Create match' }}
        </button>
      </form>
    </div>
  </div>
</template>
