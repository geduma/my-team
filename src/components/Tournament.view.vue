<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getCurrentUser,
  createTournament,
  updateTournament,
  getTournament,
  addParticipant,
  removeParticipant,
  setTournamentMatches,
  updateMatchScore,
  deleteTournament
} from '../services/db'
import { generateRoundRobin, computeStandings } from '../services/tournament'

const route = useRoute()
const router = useRouter()

const currentUser = ref(null)
const tournament = ref(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const title = ref('')
const description = ref('')
const participantName = ref('')
const participantTeam = ref('')

const showScoreModal = ref(false)
const selectedMatch = ref(null)
const homeScore = ref(0)
const awayScore = ref(0)
const showDeleteModal = ref(false)
const editingTitle = ref(false)
const editTitleValue = ref('')

const isOwner = computed(() => {
  return tournament.value && currentUser.value && tournament.value.ownerId === currentUser.value.googleId
})

const standings = computed(() => {
  if (!tournament.value) return []
  return computeStandings(tournament.value.participants, tournament.value.matches)
})

const matchesByRound = computed(() => {
  if (!tournament.value) return []
  const map = {}
  for (const m of tournament.value.matches) {
    if (!map[m.round]) map[m.round] = []
    map[m.round].push(m)
  }
  return Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]))
})

function getParticipantName (id, short) {
  if (!tournament.value) return ''
  const p = tournament.value.participants.find(p => p.id === id)
  if (!p) return 'Unknown'
  return short ? p.displayName : `${p.displayName} (${p.teamName})`
}

function getParticipantTeam (id) {
  if (!tournament.value) return ''
  const p = tournament.value.participants.find(p => p.id === id)
  return p ? p.teamName : ''
}

function getParticipantPhoto (id) {
  const p = tournament.value?.participants.find(p => p.id === id)
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${p ? encodeURIComponent(p.displayName) : id}`
}

function getPhotoURL (displayName) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`
}

onMounted(async () => {
  currentUser.value = await getCurrentUser()
  if (!currentUser.value) {
    router.push('/')
    return
  }

  const id = route.params.id
  if (id) {
    await loadTournament(id)
  } else {
    loading.value = false
  }
})

async function loadTournament (id) {
  loading.value = true
  try {
    const t = await getTournament(id)
    if (!t) {
      error.value = 'Tournament not found'
      return
    }
    tournament.value = t
  } catch {
    error.value = 'Error loading tournament'
  } finally {
    loading.value = false
  }
}

async function handleCreate () {
  if (!title.value.trim()) return
  saving.value = true
  try {
    const t = await createTournament({
      ownerId: currentUser.value.googleId,
      title: title.value.trim(),
      description: description.value.trim() || null
    })
    tournament.value = t
  } catch {
    error.value = 'Error creating tournament'
  } finally {
    saving.value = false
  }
}

function handleAddParticipant () {
  if (!participantName.value.trim() || !participantTeam.value.trim()) return
  if (!tournament.value) return

  const p = {
    displayName: participantName.value.trim(),
    teamName: participantTeam.value.trim(),
    userId: null
  }

  addParticipant(tournament.value.id, p).then(saved => {
    tournament.value.participants.push(saved)
    participantName.value = ''
    participantTeam.value = ''
  }).catch(() => {
    error.value = 'Error adding participant'
  })
}

function handleRemoveParticipant (id) {
  removeParticipant(id).then(() => {
    tournament.value.participants = tournament.value.participants.filter(p => p.id !== id)
    tournament.value.matches = []
  }).catch(() => {
    error.value = 'Error removing participant'
  })
}

async function handleGenerateMatches () {
  if (!tournament.value) return
  const participants = tournament.value.participants
  if (participants.length < 2) {
    error.value = 'Need at least 2 participants'
    return
  }

  saving.value = true
  try {
    const rounds = generateRoundRobin(participants)
    await setTournamentMatches(tournament.value.id, rounds)
    const updated = await getTournament(tournament.value.id)
    if (updated) tournament.value = updated
  } catch {
    error.value = 'Error generating matches'
  } finally {
    saving.value = false
  }
}

function openScoreModal (match) {
  selectedMatch.value = match
  homeScore.value = match.homeScore ?? 0
  awayScore.value = match.awayScore ?? 0
  showScoreModal.value = true
}

async function handleSaveScore () {
  if (!selectedMatch.value) return
  const match = selectedMatch.value
  await updateMatchScore(match.id, homeScore.value, awayScore.value)

  const updated = await getTournament(tournament.value.id)
  if (updated) tournament.value = updated

  showScoreModal.value = false
  selectedMatch.value = null
}

async function handleDeleteTournament () {
  if (!tournament.value || !isOwner.value) return
  showDeleteModal.value = false
  await deleteTournament(tournament.value.id)
  router.push('/')
}

function startEditTitle () {
  if (!tournament.value) return
  editTitleValue.value = tournament.value.title
  editingTitle.value = true
}

async function saveTitle () {
  if (!tournament.value || !editTitleValue.value.trim()) return
  await updateTournament(tournament.value.id, { title: editTitleValue.value.trim() })
  tournament.value.title = editTitleValue.value.trim()
  editingTitle.value = false
}
</script>

<template>
  <div class="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-4xl">

      <div v-if="loading" class="text-center text-[#dedcdc]">Loading...</div>

      <div v-else-if="error" class="bg-[#00000096] p-4 sm:p-10 rounded-lg text-center">
        <p class="text-red-400 text-lg">{{ error }}</p>
        <router-link to="/" class="mt-4 inline-block text-[#0b88de] hover:underline">Go home</router-link>
      </div>

      <!-- Creation form -->
      <div v-else-if="!tournament" class="bg-[#00000096] p-4 sm:p-10 rounded-lg">
        <h1 class="text-2xl font-bold text-white mb-6">New Tournament</h1>
        <div class="space-y-4">
          <div>
            <label class="sr-only" for="tournament-title">Tournament title</label>
            <input
              id="tournament-title"
              v-model="title"
              class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
              placeholder="Tournament title"
            />
          </div>
          <div>
            <label class="sr-only" for="tournament-desc">Description</label>
            <textarea
              id="tournament-desc"
              v-model="description"
              class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
              placeholder="Description (optional)"
              rows="3"
            ></textarea>
          </div>
          <button
            class="w-full sm:w-auto rounded-md bg-[#64e34f] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            :disabled="saving || !title.trim()"
            @click="handleCreate"
          >{{ saving ? 'Creating...' : 'Create Tournament' }}</button>
        </div>
      </div>

      <!-- Tournament view -->
      <div v-else class="bg-[#00000096] p-4 sm:p-10 rounded-lg">
        <!-- Header -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div v-if="editingTitle" class="flex flex-col sm:flex-row gap-2 flex-1">
            <input
              v-model="editTitleValue"
              class="w-full sm:flex-1 rounded-lg border-gray-200 p-2 text-sm shadow-sm"
              @keyup.enter="saveTitle"
            />
            <div class="flex gap-2">
              <button
                class="rounded-md bg-[#64e34f] px-3 py-2 text-sm font-semibold text-black hover:opacity-90"
                @click="saveTitle"
              >Save</button>
              <button
                class="rounded-md bg-gray-500 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-400"
                @click="editingTitle = false"
              >Cancel</button>
            </div>
          </div>
          <h1 v-else class="text-xl sm:text-2xl font-bold text-white break-words">{{ tournament.title }}</h1>
          <div v-if="isOwner" class="flex gap-2">
            <button
              class="rounded-md bg-[#0b88de] px-4 py-2 text-sm font-semibold text-white hover:bg-[#50b1f3]"
              @click="startEditTitle"
            >Edit</button>
            <button
              class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              @click="showDeleteModal = true"
            >Delete</button>
          </div>
        </div>

        <p v-if="tournament.description" class="mt-2 text-[#dedcdc] text-sm">{{ tournament.description }}</p>

        <!-- Participants section -->
        <div class="mt-8">
          <h2 class="text-lg font-semibold text-white mb-4">Participants ({{ tournament.participants.length }})</h2>

          <div v-if="isOwner" class="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              v-model="participantName"
              class="w-full sm:flex-1 rounded-lg border-gray-200 p-3 text-sm shadow-sm"
              placeholder="Player name"
              @keyup.enter="handleAddParticipant"
            />
            <input
              v-model="participantTeam"
              class="w-full sm:flex-1 rounded-lg border-gray-200 p-3 text-sm shadow-sm"
              placeholder="Team name"
              @keyup.enter="handleAddParticipant"
            />
            <button
              class="w-full sm:w-auto rounded-md bg-[#64e34f] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
              :disabled="!participantName.trim() || !participantTeam.trim()"
              @click="handleAddParticipant"
            >Add</button>
          </div>

          <div class="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            <div
              v-for="p in tournament.participants"
              :key="p.id"
              class="flex items-center gap-2 sm:gap-3 bg-gray-800 rounded-lg p-2 sm:p-3"
            >
              <img
                :src="getPhotoURL(p.displayName)"
                :alt="p.displayName"
                class="w-6 h-6 sm:w-8 sm:h-8 rounded-full shrink-0"
              />
              <span class="text-white text-sm truncate">{{ p.displayName }}</span>
              <span class="text-[#dedcdc] text-xs truncate">— {{ p.teamName }}</span>
              <button
                v-if="isOwner"
                class="ml-auto text-red-400 hover:text-red-300 text-sm shrink-0"
                @click="handleRemoveParticipant(p.id)"
              >Remove</button>
            </div>
            <p v-if="!tournament.participants.length" class="text-sm text-[#dedcdc]">No participants yet</p>
          </div>
        </div>

        <!-- Generate / Reset matches -->
        <div v-if="isOwner" class="mt-6">
          <button
            class="w-full sm:w-auto rounded-md bg-[#0b88de] px-6 py-3 text-sm font-semibold text-white hover:bg-[#50b1f3] disabled:opacity-50"
            :disabled="saving || tournament.participants.length < 2"
            @click="handleGenerateMatches"
          >{{ saving ? 'Saving...' : tournament.matches.length ? 'Reset matches' : 'Generate matches' }}</button>
          <p v-if="tournament.participants.length < 2" class="mt-2 text-sm text-[#dedcdc]">Add at least 2 participants to generate matches</p>
        </div>

        <!-- Matches / Standings -->
        <div v-if="tournament.matches.length" class="mt-8 space-y-8">
          <!-- Standings -->
          <div>
            <h2 class="text-lg font-semibold text-white mb-4">Standings</h2>
            <div class="-mx-6 sm:mx-0 overflow-x-auto">
              <table class="w-full text-xs sm:text-sm text-[#dedcdc]">
                <thead>
                  <tr class="border-b border-gray-700 text-left">
                    <th class="p-1 sm:p-2">#</th>
                    <th class="p-1 sm:p-2">Player</th>
                    <th class="p-1 sm:p-2 hidden sm:table-cell">Team</th>
                    <th class="p-1 sm:p-2 text-center">PJ</th>
                    <th class="p-1 sm:p-2 text-center">G</th>
                    <th class="p-1 sm:p-2 text-center">E</th>
                    <th class="p-1 sm:p-2 text-center">P</th>
                    <th class="p-1 sm:p-2 text-center">GF</th>
                    <th class="p-1 sm:p-2 text-center">GC</th>
                    <th class="p-1 sm:p-2 text-center">DG</th>
                    <th class="p-1 sm:p-2 text-center font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(s, i) in standings"
                    :key="s.participantId"
                    class="border-b border-gray-800"
                  >
                    <td class="p-1 sm:p-2">{{ i + 1 }}</td>
                    <td class="p-1 sm:p-2">
                      <div class="flex items-center gap-1 sm:gap-2">
                        <img
                          :src="getPhotoURL(s.displayName)"
                          :alt="s.displayName"
                          class="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0"
                        />
                        <span class="text-white truncate max-w-[80px] sm:max-w-none">{{ s.displayName }}</span>
                      </div>
                    </td>
                    <td class="p-1 sm:p-2 hidden sm:table-cell">{{ s.teamName }}</td>
                    <td class="p-1 sm:p-2 text-center">{{ s.played }}</td>
                    <td class="p-1 sm:p-2 text-center">{{ s.wins }}</td>
                    <td class="p-1 sm:p-2 text-center">{{ s.draws }}</td>
                    <td class="p-1 sm:p-2 text-center">{{ s.losses }}</td>
                    <td class="p-1 sm:p-2 text-center">{{ s.goalsFor }}</td>
                    <td class="p-1 sm:p-2 text-center">{{ s.goalsAgainst }}</td>
                    <td class="p-1 sm:p-2 text-center" :class="s.goalDiff > 0 ? 'text-[#64e34f]' : s.goalDiff < 0 ? 'text-red-400' : ''">{{ s.goalDiff }}</td>
                    <td class="p-1 sm:p-2 text-center font-bold text-white">{{ s.points }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Match list -->
          <div>
            <h2 class="text-lg font-semibold text-white mb-4">Matches</h2>
            <div class="max-h-[400px] overflow-y-auto pr-1 space-y-3">
              <div v-for="[round, matches] in matchesByRound" :key="round">
                <h3 class="text-sm font-semibold text-[#dedcdc] mb-1">Round {{ round }}</h3>
                <div class="space-y-1">
                  <div
                    v-for="m in matches"
                    :key="m.id"
                    class="flex flex-row items-center gap-1 sm:gap-2 bg-gray-800 rounded-lg p-1.5 sm:p-2.5 cursor-pointer"
                    :class="{ 'hover:bg-gray-700': isOwner }"
                    @click="isOwner ? openScoreModal(m) : null"
                  >
                    <div class="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
                      <span class="text-white text-sm truncate">{{ getParticipantName(m.homeParticipantId, true) }}</span>
                      <img
                        :src="getParticipantPhoto(m.homeParticipantId)"
                        alt=""
                        class="w-6 h-6 rounded-full shrink-0"
                      />
                    </div>
                  <div class="flex items-center gap-1 sm:gap-2 justify-center">
                    <template v-if="m.status === 'played'">
                      <span class="text-white font-bold text-sm sm:text-base">{{ m.homeScore }}</span>
                      <span class="text-[#dedcdc]">-</span>
                      <span class="text-white font-bold text-sm sm:text-base">{{ m.awayScore }}</span>
                    </template>
                    <template v-else>
                      <span class="text-[#dedcdc] text-xs sm:text-sm italic">vs</span>
                    </template>
                  </div>
                  <div class="flex items-center gap-1 sm:gap-2 flex-1 justify-start">
                      <img
                        :src="getParticipantPhoto(m.awayParticipantId)"
                        alt=""
                        class="w-6 h-6 rounded-full shrink-0"
                      />
                      <span class="text-white text-sm truncate">{{ getParticipantName(m.awayParticipantId, true) }}</span>
                    </div>
                  <span
                    class="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-center sm:text-left"
                    :class="m.status === 'played' ? 'bg-[#64e34f] text-black' : 'bg-gray-600 text-[#dedcdc]'"
                  >{{ m.status === 'played' ? 'Played' : 'Pending' }}</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showScoreModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" @click.self="showScoreModal = false">
      <div class="bg-[#1a1a1a] rounded-lg p-6 sm:p-8 shadow-xl w-full max-w-sm mx-4 sm:mx-0">
          <h2 class="text-white text-lg font-semibold mb-2">Match score</h2>
        <div class="flex items-center justify-center gap-2 sm:gap-4 mb-6">
          <div class="flex flex-col items-center gap-2">
            <img
              :src="selectedMatch ? getParticipantPhoto(selectedMatch.homeParticipantId) : ''"
              alt=""
              class="w-10 h-10 rounded-full"
            />
            <p class="text-[#dedcdc] text-sm">{{ selectedMatch ? getParticipantName(selectedMatch.homeParticipantId) : '' }}</p>
            <label class="text-xs text-[#dedcdc] opacity-60">{{ selectedMatch ? getParticipantTeam(selectedMatch.homeParticipantId) : '' }}</label>
            <input
              v-model.number="homeScore"
              type="number"
              min="0"
              class="w-20 text-center rounded-lg border-gray-200 p-3 text-sm shadow-sm"
            />
          </div>
          <span class="text-white text-lg font-bold mt-8">-</span>
          <div class="flex flex-col items-center gap-2">
            <img
              :src="selectedMatch ? getParticipantPhoto(selectedMatch.awayParticipantId) : ''"
              alt=""
              class="w-10 h-10 rounded-full"
            />
            <p class="text-[#dedcdc] text-sm">{{ selectedMatch ? getParticipantName(selectedMatch.awayParticipantId) : '' }}</p>
            <label class="text-xs text-[#dedcdc] opacity-60">{{ selectedMatch ? getParticipantTeam(selectedMatch.awayParticipantId) : '' }}</label>
            <input
              v-model.number="awayScore"
              type="number"
              min="0"
              class="w-20 text-center rounded-lg border-gray-200 p-3 text-sm shadow-sm"
            />
          </div>
        </div>
        <div class="flex gap-3">
          <button
            class="flex-1 rounded-md bg-[#64e34f] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            @click="handleSaveScore"
          >Save</button>
          <button
            class="flex-1 rounded-md bg-gray-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-400"
            @click="showScoreModal = false"
          >Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" @click.self="showDeleteModal = false">
      <div class="bg-[#1a1a1a] rounded-lg p-8 shadow-xl w-80">
        <h2 class="text-white text-lg font-semibold mb-2">Delete tournament</h2>
        <p class="text-[#dedcdc] text-sm mb-6">Are you sure you want to delete this tournament? All data will be lost.</p>
        <div class="flex gap-3">
          <button
            class="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            @click="handleDeleteTournament"
          >Delete</button>
          <button
            class="flex-1 rounded-md bg-gray-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-400"
            @click="showDeleteModal = false"
          >Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
