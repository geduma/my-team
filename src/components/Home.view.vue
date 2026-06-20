<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login as authLogin, signOut } from '../services/auth'
import { getCurrentUser } from '../services/db'

const route = useRoute()
const router = useRouter()
const showFindModal = ref(false)
const findHash = ref('')
const findError = ref('')
const finding = ref(false)
const loginTarget = ref(null)
const loginError = ref('')
const user = ref(null)

async function checkAuth () {
  user.value = await getCurrentUser()
}

onMounted(async () => {
  await checkAuth()
  if (route.query.login === 'true' && !user.value) {
    authLogin('prov_google')
  }
})

watch(() => route.query.login, async (val) => {
  if (val === 'true' && !user.value) {
    authLogin('prov_google')
  }
})

async function handleSignOut () {
  await signOut()
  user.value = null
}

async function doLogin (target, redirectTo) {
  if (user.value) {
    router.push(redirectTo)
    return
  }
  loginError.value = ''
  loginTarget.value = target
  try {
    await authLogin('prov_google', redirectTo)
  } catch (e) {
    loginError.value = e.message || 'Login failed. Please try again.'
    loginTarget.value = null
  }
}

function openLogin () {
  doLogin('create', '/create')
}

function openTournament () {
  doLogin('tournament', '/tournament')
}

function openFind () {
  findHash.value = ''
  findError.value = ''
  showFindModal.value = true
}

function handleFind () {
  if (!findHash.value.trim()) {
    findError.value = 'Please enter an event code'
    return
  }
  finding.value = true
  showFindModal.value = false
  router.push(`/join/${findHash.value.trim()}`)
}
</script>

<template>
  <main class="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
    <div class="text-center">
      <h1 class="mt-4 font-bold tracking-tight text-[#e34040] text-8xl">My<span class="text-[#64e34f]">Team</span></h1>
      <p class="mt-2 tracking-tight text-[#dedcdc] text-2xl">The Ultimate Soccer Organizer</p>
      <p class="mt-8 text-[#dedcdc]">Perfect app to effortlessly organize and coordinate soccer matches with your friends</p>
      <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-x-6">
        <button
          class="w-full sm:w-auto rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          :disabled="loginTarget === 'create'"
          @click="openLogin"
        >
          <svg v-if="loginTarget === 'create'" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ loginTarget === 'create' ? 'Signing in...' : 'Create Match' }}
        </button>
        <button
          class="w-full sm:w-auto rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          @click="openFind"
        >Find Match</button>
        <button
          class="w-full sm:w-auto rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          :disabled="loginTarget === 'tournament'"
          @click="openTournament"
        >
          <svg v-if="loginTarget === 'tournament'" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ loginTarget === 'tournament' ? 'Signing in...' : 'New Tournament' }}
        </button>
        <router-link
          class="w-full sm:w-auto rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          to="/events"
        >All Events</router-link>
      </div>
      <p v-if="loginError" class="mt-4 text-red-400 text-sm">{{ loginError }}</p>
      <div v-if="user" class="mt-6 flex items-center justify-center gap-4 text-sm">
        <span class="text-[#dedcdc]">Logged in as {{ user.displayName }}</span>
        <button class="text-red-400 hover:text-red-300" @click="handleSignOut">Sign out</button>
      </div>
    </div>
  </main>

  <Teleport to="body">
    <div v-if="showFindModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" @click.self="showFindModal = false">
      <div class="bg-[#1a1a1a] rounded-lg p-8 shadow-xl w-80">
        <h2 class="text-white text-lg font-semibold mb-6 text-center">Find Match</h2>
        <p class="text-[#dedcdc] text-sm mb-4">Enter the event code from the invite link</p>
        <input
          v-model="findHash"
          class="w-full rounded-lg border-gray-200 p-4 text-sm shadow-sm"
          placeholder="Event code"
          @keyup.enter="handleFind"
        />
        <p v-if="findError" class="text-red-400 text-sm mt-2">{{ findError }}</p>
        <div class="flex gap-3 mt-6">
          <button
            class="flex-1 rounded-md bg-[#0b88de] px-4 py-2 text-sm font-semibold text-white hover:bg-[#50b1f3] disabled:opacity-50"
            :disabled="finding"
            @click="handleFind"
          >{{ finding ? 'Joining...' : 'Join' }}</button>
          <button
            class="flex-1 rounded-md bg-gray-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-400"
            @click="showFindModal = false"
          >Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
