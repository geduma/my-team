<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentUser, getEvent, saveEvent, deleteEvent, renewEvent, setPlayerTeam, shuffleTeams, removePlayerFromEvent, isEventExpired } from '../services/db'
import { createGuestUser, setGuestDisplayName, isGoogleUser } from '../services/auth'

const route = useRoute()
const router = useRouter()

const currentUser = ref(null)
const event = ref(null)
const loading = ref(true)
const editing = ref(false)
const eventBackup = ref(null)
const error = ref('')
const copySuccess = ref(false)
const showDeleteModal = ref(false)
const saving = ref(false)
const deleting = ref(false)
const joining = ref(false)
const shuffling = ref(false)
const removingPlayer = ref(false)
const renewing = ref(false)

const isOwner = computed(() => {
      return event.value && currentUser.value && event.value.ownerId === currentUser.value.googleId
})

const isSuperuser = computed(() => currentUser.value?.isSuperuser === true)

const isExpired = computed(() => isEventExpired(event.value))

const canManage = computed(() => isOwner.value || isSuperuser.value)

const canEdit = computed(() => canManage.value && (!isExpired.value || isSuperuser.value))

const hasJoined = computed(() => {
  if (!event.value || !currentUser.value) return false
  return event.value.players.some(p => p.id === currentUser.value.googleId)
})

const inviteLink = computed(() => {
  if (!event.value) return ''
  return `${window.location.origin}/join/${event.value.hash}`
})

const isTournament = computed(() => route.name === 'tournament')
const isPreview = computed(() => route.meta.preview === true)

onMounted(async () => {
  let user = await getCurrentUser()
  if (!user) {
    user = await createGuestUser()
  }
  currentUser.value = user
  if (!isPreview.value && isTournament.value) {
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
  eventBackup.value = { ...event.value }
  editing.value = true
}

function cancelEditing () {
  if (eventBackup.value) {
    event.value = { ...eventBackup.value }
    eventBackup.value = null
  }
  editing.value = false
}

async function saveChanges () {
  if (!event.value) return
  saving.value = true
  await saveEvent(event.value)
  saving.value = false
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

function confirmDelete () {
  showDeleteModal.value = true
}

async function handleDelete () {
  if (!event.value || !canManage.value) return
  showDeleteModal.value = false
  deleting.value = true
  await deleteEvent(event.value.id)
  router.push('/')
}

async function handleRenew () {
  if (!event.value || !isSuperuser.value) return
  renewing.value = true
  await renewEvent(event.value.id)
  await loadEvent()
  renewing.value = false
}

async function handleJoin () {
  if (!event.value || !currentUser.value || isExpired.value) return

  if (!isGoogleUser(currentUser.value) && !currentUser.value.displayName) {
    joinName.value = ''
    joinNameError.value = ''
    showNameModal.value = true
    return
  }

  joining.value = true
  const name = currentUser.value.displayName
  const updated = { ...event.value }
  updated.players.push({
    id: currentUser.value.googleId,
    displayName: name,
    photoURL: currentUser.value.photoURL,
    team: null
  })
  await saveEvent(updated)
  event.value = updated
  joining.value = false
}

function confirmJoinName () {
  if (!joinName.value.trim()) {
    joinNameError.value = 'Name is required'
    return
  }
  if (event.value && event.value.players.some(p =>
    p.displayName?.toLowerCase() === joinName.value.trim().toLowerCase()
  )) {
    joinNameError.value = 'Name already taken in this event'
    return
  }

  setGuestDisplayName(joinName.value.trim())
  showNameModal.value = false
  currentUser.value.displayName = joinName.value.trim()
  handleJoin()
}

async function handleRemovePlayer (userId) {
  if (!event.value || !canEdit.value) return
  removingPlayer.value = true
  await removePlayerFromEvent(event.value.id, userId)
  event.value = await getEvent(event.value.id)
  removingPlayer.value = false
}

const showNameModal = ref(false)
const joinName = ref('')
const joinNameError = ref('')

const showLineup = ref(false)
const lineupPlayers = ref([])

const team1 = computed(() => lineupPlayers.value.filter(p => p.team === 'team1'))
const team2 = computed(() => lineupPlayers.value.filter(p => p.team === 'team2'))

async function openLineup () {
  showLineup.value = true
  try {
    const fresh = await getEvent(event.value?.id)
    if (fresh) {
      event.value = fresh
      lineupPlayers.value = fresh.players.map(p => ({ ...p }))
    } else if (event.value) {
      lineupPlayers.value = event.value.players.map(p => ({ ...p }))
    }
  } catch {
    if (event.value) {
      lineupPlayers.value = event.value.players.map(p => ({ ...p }))
    }
  }
  const hasTeams = lineupPlayers.value.some(p => p.team === 'team1' || p.team === 'team2')
  if (!hasTeams && lineupPlayers.value.length > 0) {
    await handleShuffle()
  }
}

async function handleShuffle () {
  if (!event.value) return
  shuffling.value = true
  await shuffleTeams(event.value.id)
  const updated = await getEvent(event.value.id)
  if (updated) {
    event.value = updated
    lineupPlayers.value = updated.players.map(p => ({ ...p }))
  }
  shuffling.value = false
}

async function handleSwapPlayer (playerId, toTeam) {
  if (!event.value || !canEdit.value) return
  await setPlayerTeam(event.value.id, playerId, toTeam)
  const p = lineupPlayers.value.find(p => p.id === playerId)
  if (p) p.team = toTeam
  const ep = event.value.players.find(p => p.id === playerId)
  if (ep) ep.team = toTeam
}

function getPosition (index, total, zone, orientation) {
  const cols = Math.min(Math.ceil(Math.sqrt(total)), 4)
  const rows = Math.ceil(total / cols)
  const col = index % cols
  const row = Math.floor(index / cols)

  if (orientation === 'portrait') {
    const cellW = 70 / cols
    const cellH = 40 / rows
    const x = 15 + col * cellW + cellW * 0.15
    const yBase = zone === 'top' ? 5 : 55
    const y = yBase + row * cellH + cellH * 0.15
    return { left: `${x}%`, top: `${y}%` }
  } else {
    const cellW = 40 / cols
    const cellH = 75 / rows
    const xBase = zone === 'left' ? 5 : 55
    const x = xBase + col * cellW + cellW * 0.15
    const y = 5 + row * cellH + cellH * 0.15
    return { left: `${x}%`, top: `${y}%` }
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
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold text-white">{{ event.title }}</h1>
              <div v-if="isPreview && !canManage" class="text-xs text-[#dedcdc]/60 border border-[#dedcdc]/30 rounded-full px-2 py-0.5">Preview</div>
              <div v-else-if="isExpired" class="text-xs text-red-400 border border-red-400/40 rounded-full px-2 py-0.5">Expired</div>
            </div>
            <div v-if="canManage && !editing" class="flex flex-wrap gap-2">
              <button
                v-if="canEdit"
                class="rounded-md bg-[#0b88de] px-4 py-2 text-sm font-semibold text-white hover:bg-[#50b1f3]"
                @click="startEditing"
              >Edit</button>
              <button
                class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                @click="confirmDelete"
              >Delete</button>
              <button
                v-if="isExpired && isSuperuser"
                class="rounded-md bg-[#64e34f] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
                :disabled="renewing"
                @click="handleRenew"
              >{{ renewing ? 'Renewing...' : 'Renew' }}</button>
            </div>
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
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                class="rounded-md bg-[#64e34f] px-5 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
                :disabled="saving"
                @click="saveChanges"
              >{{ saving ? 'Saving...' : 'Save' }}</button>
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
              <button
                v-if="event.players.length"
                class="mt-2 rounded-md bg-[#64e34f] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                @click="openLineup"
              >View Lineup</button>
            </div>

            <div v-if="!canManage && !hasJoined && !isExpired && !isPreview" class="pt-4 border-t border-gray-700 text-center">
              <button
                class="rounded-md bg-[#64e34f] px-6 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90 disabled:opacity-50"
                :disabled="joining"
                @click="handleJoin"
              >{{ joining ? 'Joining...' : 'Join match' }}</button>
            </div>

            <!-- Invite link (owner only) -->
            <div v-if="canManage" class="pt-4 border-t border-gray-700">
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
              <div class="mt-2 max-h-[300px] overflow-y-auto space-y-2 pr-1">
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
                  <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs shrink-0" v-else>
                    {{ player.displayName?.charAt(0) }}
                  </div>
                  <span class="text-white text-sm truncate">{{ player.displayName }}</span>
                  <span v-if="player.id === event.ownerId" class="text-xs text-[#64e34f] ml-auto shrink-0">Owner</span>
                  <button
                    v-if="canEdit && player.id !== event.ownerId"
                    class="ml-auto text-xs text-red-400 hover:text-red-300 shrink-0 disabled:opacity-50"
                    :disabled="removingPlayer"
                    @click="handleRemovePlayer(player.id)"
                  >{{ removingPlayer ? '...' : 'Remove' }}</button>
                </div>
                <p v-if="!event.players.length" class="text-sm opacity-60">No players yet</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showNameModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" @click.self="showNameModal = false">
      <div class="bg-[#1a1a1a] rounded-lg p-8 shadow-xl w-80">
        <h2 class="text-white text-lg font-semibold mb-2">Join match</h2>
        <p class="text-[#dedcdc] text-sm mb-4">Enter your name to join this match</p>
        <input
          v-model="joinName"
          class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
          placeholder="Your name"
          @keyup.enter="confirmJoinName"
        />
        <p v-if="joinNameError" class="mt-2 text-red-400 text-sm">{{ joinNameError }}</p>
        <div class="flex gap-3 mt-6">
          <button
            class="flex-1 rounded-md bg-[#64e34f] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            :disabled="joining || !joinName.trim()"
            @click="confirmJoinName"
          >{{ joining ? 'Joining...' : 'Join' }}</button>
          <button
            class="flex-1 rounded-md bg-gray-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-400"
            @click="showNameModal = false"
          >Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" @click.self="showDeleteModal = false">
      <div class="bg-[#1a1a1a] rounded-lg p-8 shadow-xl w-80">
        <h2 class="text-white text-lg font-semibold mb-2">Delete match</h2>
        <p class="text-[#dedcdc] text-sm mb-6">Are you sure you want to delete this match? All player data will be lost.</p>
        <div class="flex gap-3">
          <button
            class="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            :disabled="deleting"
            @click="handleDelete"
          >{{ deleting ? 'Deleting...' : 'Delete' }}</button>
          <button
            class="flex-1 rounded-md bg-gray-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-400"
            @click="showDeleteModal = false"
          >Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="showLineup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" @click.self="showLineup = false">
      <div class="bg-[#1a1a1a] rounded-lg p-6 shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-white text-lg font-semibold">Lineup</h2>
          <button
            class="text-[#dedcdc] hover:text-white text-xl leading-none"
            @click="showLineup = false"
          >&times;</button>
        </div>

        <!-- Soccer field — desktop landscape -->
        <div class="hidden md:block relative w-full aspect-[3/2] bg-green-700 rounded-lg border-2 border-white/30 overflow-hidden">
          <div class="absolute left-1/2 top-0 w-0.5 h-full bg-white/40"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/40"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/60"></div>
          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-36 border-2 border-white/30 border-l-0"></div>
          <div class="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-36 border-2 border-white/30 border-r-0"></div>
          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-16 border-2 border-white/40 border-l-0 bg-white/5"></div>
          <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-16 border-2 border-white/40 border-r-0 bg-white/5"></div>

          <template v-for="(p, i) in team1" :key="p.id">
            <div
              class="absolute flex flex-col items-center gap-0.5 cursor-pointer z-10"
              :style="getPosition(i, team1.length, 'left', 'landscape')"
              @click="canEdit && !isPreview ? handleSwapPlayer(p.id, 'team2') : null"
            >
              <img v-if="p.photoURL" :src="p.photoURL" :alt="p.displayName" class="w-8 h-8 rounded-full border-2 border-white shadow-md" />
              <div v-else class="w-8 h-8 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-xs text-white shadow-md">{{ p.displayName?.charAt(0) }}</div>
              <span class="text-xs text-white font-semibold bg-black/50 px-1 rounded whitespace-nowrap">{{ p.displayName }}</span>
            </div>
          </template>

          <template v-for="(p, i) in team2" :key="p.id">
            <div
              class="absolute flex flex-col items-center gap-0.5 cursor-pointer z-10"
              :style="getPosition(i, team2.length, 'right', 'landscape')"
              @click="canEdit && !isPreview ? handleSwapPlayer(p.id, 'team1') : null"
            >
              <img v-if="p.photoURL" :src="p.photoURL" :alt="p.displayName" class="w-8 h-8 rounded-full border-2 border-white shadow-md" />
              <div v-else class="w-8 h-8 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-xs text-white shadow-md">{{ p.displayName?.charAt(0) }}</div>
              <span class="text-xs text-white font-semibold bg-black/50 px-1 rounded whitespace-nowrap">{{ p.displayName }}</span>
            </div>
          </template>
        </div>

        <!-- Soccer field — mobile portrait -->
        <div class="block md:hidden relative w-full aspect-[2/3] bg-green-700 rounded-lg border-2 border-white/30 overflow-hidden">
          <div class="absolute top-1/2 left-0 h-0.5 w-full bg-white/40"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/40"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/60"></div>
          <div class="absolute top-0 left-1/2 -translate-x-1/2 h-16 w-36 border-2 border-white/30 border-t-0"></div>
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 h-16 w-36 border-2 border-white/30 border-b-0"></div>
          <div class="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-16 border-2 border-white/40 border-t-0 bg-white/5"></div>
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 h-3 w-16 border-2 border-white/40 border-b-0 bg-white/5"></div>

          <template v-for="(p, i) in team1" :key="p.id">
            <div
              class="absolute flex flex-col items-center gap-0.5 cursor-pointer z-10"
              :style="getPosition(i, team1.length, 'bottom', 'portrait')"
              @click="canEdit && !isPreview ? handleSwapPlayer(p.id, 'team2') : null"
            >
              <img v-if="p.photoURL" :src="p.photoURL" :alt="p.displayName" class="w-8 h-8 rounded-full border-2 border-white shadow-md" />
              <div v-else class="w-8 h-8 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-xs text-white shadow-md">{{ p.displayName?.charAt(0) }}</div>
              <span class="text-xs text-white font-semibold bg-black/50 px-1 rounded whitespace-nowrap">{{ p.displayName }}</span>
            </div>
          </template>

          <template v-for="(p, i) in team2" :key="p.id">
            <div
              class="absolute flex flex-col items-center gap-0.5 cursor-pointer z-10"
              :style="getPosition(i, team2.length, 'top', 'portrait')"
              @click="canEdit && !isPreview ? handleSwapPlayer(p.id, 'team1') : null"
            >
              <img v-if="p.photoURL" :src="p.photoURL" :alt="p.displayName" class="w-8 h-8 rounded-full border-2 border-white shadow-md" />
              <div v-else class="w-8 h-8 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-xs text-white shadow-md">{{ p.displayName?.charAt(0) }}</div>
              <span class="text-xs text-white font-semibold bg-black/50 px-1 rounded whitespace-nowrap">{{ p.displayName }}</span>
            </div>
          </template>
        </div>

        <!-- Teams info -->
        <div class="flex justify-between mt-4 text-sm text-[#dedcdc]">
          <div>
            <span class="text-white font-semibold">Team 1</span>
            <span class="ml-1">({{ team1.length }})</span>
          </div>
          <div>
            <span class="text-white font-semibold">Team 2</span>
            <span class="ml-1">({{ team2.length }})</span>
          </div>
        </div>

        <!-- Owner controls -->
        <div v-if="canEdit && !isPreview" class="flex justify-center mt-4">
          <button
            class="rounded-md bg-[#0b88de] px-6 py-2 text-sm font-semibold text-white hover:bg-[#50b1f3] disabled:opacity-50"
            :disabled="shuffling"
            @click="handleShuffle"
          >{{ shuffling ? 'Shuffling...' : 'Shuffle' }}</button>
        </div>
        <p v-if="canEdit && !isPreview" class="text-xs text-[#dedcdc] text-center mt-2">Click a player to move them to the other team</p>
      </div>
    </div>
  </Teleport>
</template>
