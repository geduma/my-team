<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentUser, getEvent, saveEvent } from '../services/db'

const route = useRoute()
const router = useRouter()

const currentUser = ref(null)
const event = ref(null)
const loading = ref(true)
const editing = ref(false)
const error = ref('')
const copySuccess = ref(false)

const isOwner = computed(() => {
  return event.value && currentUser.value && event.value.ownerId === currentUser.value.id
})

const inviteLink = computed(() => {
  if (!event.value) return ''
  return `${window.location.origin}/join/${event.value.hash}`
})

const isTournament = computed(() => route.name === 'tournament')

onMounted(async () => {
  currentUser.value = await getCurrentUser()
  if (!currentUser.value) {
    router.push('/')
    return
  }
  if (isTournament.value) {
    loading.value = false
    return
  }
  await loadEvent()
})

async function loadEvent () {
  loading.value = true
  error.value = ''
  try {
    const id = route.params.id
    if (!id) {
      error.value = 'No event ID provided'
      return
    }
    const found = await getEvent(id)
    if (!found) {
      error.value = 'Event not found'
      return
    }
    event.value = { ...found }
  } catch (e) {
    error.value = 'Error loading event'
  } finally {
    loading.value = false
  }
}

function startEditing () {
  editing.value = true
}

function cancelEditing () {
  editing.value = false
}

async function saveChanges () {
  if (!event.value) return
  await saveEvent(event.value)
  editing.value = false
}

async function copyLink () {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch {
    // fallback
  }
}
</script>

<template>
  <div class="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-2xl">

      <!-- Tournament placeholder -->
      <div v-if="isTournament" class="bg-[#00000096] p-10 rounded-lg text-center">
        <h1 class="text-2xl font-bold text-[#64e34f]">Tournament</h1>
        <p class="mt-4 text-[#dedcdc]">Coming soon...</p>
        <router-link to="/" class="mt-6 inline-block text-[#0b88de] hover:underline">Go home</router-link>
      </div>

      <template v-else>
        <div v-if="loading" class="text-center text-[#dedcdc]">Loading...</div>

        <div v-else-if="error" class="bg-[#00000096] p-10 rounded-lg text-center">
          <p class="text-red-400 text-lg">{{ error }}</p>
          <router-link to="/" class="mt-4 inline-block text-[#0b88de] hover:underline">Go home</router-link>
        </div>

        <div v-else-if="event" class="bg-[#00000096] p-10 rounded-lg">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold text-white">{{ event.title }}</h1>
            <button
              v-if="isOwner && !editing"
              class="rounded-md bg-[#0b88de] px-4 py-2 text-sm font-semibold text-white hover:bg-[#50b1f3]"
              @click="startEditing"
            >Edit</button>
          </div>

          <!-- Edit mode -->
          <div v-if="editing" class="mt-6 space-y-4">
            <div>
              <label class="sr-only" for="edit-title">Title</label>
              <input
                id="edit-title"
                v-model="event.title"
                class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
                placeholder="Match title"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="sr-only" for="edit-date">Date</label>
                <input
                  id="edit-date"
                  v-model="event.date"
                  type="date"
                  class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
                />
              </div>
              <div>
                <label class="sr-only" for="edit-time">Time</label>
                <input
                  id="edit-time"
                  v-model="event.time"
                  type="time"
                  class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
                />
              </div>
            </div>
            <div>
              <label class="sr-only" for="edit-location">Location</label>
              <input
                id="edit-location"
                v-model="event.location"
                class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
                placeholder="Location"
              />
            </div>
            <div>
              <label class="sr-only" for="edit-maxPlayers">Players</label>
              <input
                id="edit-maxPlayers"
                v-model="event.maxPlayers"
                type="number"
                min="2"
                max="50"
                class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
              />
            </div>
            <div>
              <textarea
                v-model="event.description"
                class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
                placeholder="Description"
                rows="3"
              ></textarea>
            </div>
            <div class="flex gap-3">
              <button
                class="rounded-md bg-[#64e34f] px-5 py-2 text-sm font-semibold text-black hover:opacity-90"
                @click="saveChanges"
              >Save</button>
              <button
                class="rounded-md bg-gray-500 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-400"
                @click="cancelEditing"
              >Cancel</button>
            </div>
          </div>

          <!-- View mode -->
          <div v-else class="mt-6 space-y-4 text-[#dedcdc]">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-sm opacity-60">Date</span>
                <p class="text-white">{{ event.date }}</p>
              </div>
              <div>
                <span class="text-sm opacity-60">Time</span>
                <p class="text-white">{{ event.time }}</p>
              </div>
            </div>
            <div>
              <span class="text-sm opacity-60">Location</span>
              <p class="text-white">{{ event.location }}</p>
            </div>
            <div v-if="event.description">
              <span class="text-sm opacity-60">Description</span>
              <p class="text-white">{{ event.description }}</p>
            </div>
            <div>
              <span class="text-sm opacity-60">Players</span>
              <p class="text-white">{{ event.players.length }} / {{ event.maxPlayers }}</p>
            </div>

            <!-- Invite link (owner only) -->
            <div v-if="isOwner" class="pt-4 border-t border-gray-700">
              <span class="text-sm opacity-60">Invite link</span>
              <div class="flex gap-2 mt-1">
                <input
                  :value="inviteLink"
                  class="flex-1 rounded-lg bg-gray-800 border-gray-700 p-3 text-sm text-[#dedcdc]"
                  readonly
                  @click="$event.target.select()"
                />
                <button
                  class="rounded-md bg-[#0b88de] px-4 py-2 text-sm font-semibold text-white hover:bg-[#50b1f3]"
                  @click="copyLink"
                >{{ copySuccess ? 'Copied!' : 'Copy' }}</button>
              </div>
            </div>

            <!-- Players list -->
            <div class="pt-4 border-t border-gray-700">
              <span class="text-sm opacity-60">Confirmed players</span>
              <div class="mt-2 space-y-2">
                <div
                  v-for="player in event.players"
                  :key="player.id"
                  class="flex items-center gap-3 bg-gray-800 rounded-lg p-3"
                >
                  <img
                    v-if="player.photoURL"
                    :src="player.photoURL"
                    :alt="player.displayName"
                    class="w-8 h-8 rounded-full"
                  />
                  <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs" v-else>
                    {{ player.displayName?.charAt(0) }}
                  </div>
                  <span class="text-white text-sm">{{ player.displayName }}</span>
                  <span v-if="player.id === event.ownerId" class="text-xs text-[#64e34f] ml-auto">Owner</span>
                </div>
                <p v-if="!event.players.length" class="text-sm opacity-60">No players yet</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
