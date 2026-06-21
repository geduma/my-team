<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAllEvents, getAllTournaments, isEventExpired, getCurrentUser } from '../services/db'

const currentUser = ref(null)
const allEvents = ref([])
const loading = ref(true)

const events = computed(() => {
  const isSuperuser = currentUser.value?.isSuperuser === true
  return isSuperuser
    ? allEvents.value
    : allEvents.value.filter(e => !isEventExpired(e))
})

onMounted(async () => {
  currentUser.value = await getCurrentUser()
  try {
    const [matchEvents, tournaments] = await Promise.all([
      getAllEvents(),
      getAllTournaments()
    ])

    const mapped = tournaments.map(t => ({
      id: t.id,
      hash: t.id.slice(0, 8),
      title: t.title,
      type: 'tournament',
      date: null,
      time: null,
      location: null,
      players: t.participants || [],
      maxPlayers: null,
      ownerId: t.ownerId,
      createdAt: t.createdAt,
      _isTournament: true
    }))

    allEvents.value = [...matchEvents, ...mapped].sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
  } catch {
    allEvents.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-5xl">
      <h1 class="text-center text-2xl font-bold text-[#dedcdc] sm:text-3xl">
        All Events
      </h1>

      <div v-if="loading" class="mt-8 text-center text-[#dedcdc]">Loading...</div>

      <div v-else-if="!events.length" class="mt-8 text-center">
        <p class="text-[#dedcdc]">No events yet</p>
        <router-link to="/" class="mt-4 inline-block text-[#0b88de] hover:underline">Go home</router-link>
      </div>

      <div v-else class="mt-8 overflow-x-auto bg-[#00000096] rounded-lg p-6">
        <table class="w-full text-left text-sm text-[#dedcdc]">
          <thead class="text-xs uppercase text-[#dedcdc]/60">
            <tr class="border-b border-gray-700">
              <th class="px-4 py-3 font-medium">ID</th>
              <th class="px-4 py-3 font-medium">Title</th>
              <th class="px-4 py-3 font-medium">Type</th>
              <th class="px-4 py-3 font-medium">Date</th>
              <th class="px-4 py-3 font-medium">Time</th>
              <th class="px-4 py-3 font-medium">Location</th>
              <th class="px-4 py-3 font-medium">Players</th>
              <th class="px-4 py-3 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <tr
              v-for="event in events"
              :key="event.id"
              class="hover:bg-white/5 cursor-pointer"
              @click="$router.push(event._isTournament ? `/preview/tournament/${event.id}` : `/preview/match/${event.id}`)"
            >
              <td class="px-4 py-3 font-mono text-xs text-[#dedcdc]/60">{{ event.hash || '—' }}</td>
              <td class="px-4 py-3 font-medium text-white">{{ event.title }}
                <span v-if="isEventExpired(event)" class="ml-2 text-xs text-red-400 border border-red-400/40 rounded-full px-1.5 py-0.5">Expired</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="event.type === 'tournament' ? 'bg-[#e34040]/20 text-[#e34040]' : 'bg-[#0b88de]/20 text-[#0b88de]'"
                >{{ event.type === 'tournament' ? 'Tournament' : 'Match' }}</span>
              </td>
              <td class="px-4 py-3">{{ event.date || '—' }}</td>
              <td class="px-4 py-3">{{ event.time || '—' }}</td>
              <td class="px-4 py-3">{{ event.location || '—' }}</td>
              <td class="px-4 py-3">{{ event._isTournament ? event.players.length : `${event.players.length} / ${event.maxPlayers}` }}</td>
              <td class="px-4 py-3">{{ event.players.find(p => p.id === event.ownerId)?.displayName || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
