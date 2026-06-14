<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initAuth, renderSignInButton, onSignIn, signOut } from '../services/auth'
import { getCurrentUser } from '../services/db'

const route = useRoute()
const router = useRouter()
const showLogin = ref(false)
const showFindModal = ref(false)
const findHash = ref('')
const findError = ref('')
const signInContainer = ref(null)
const user = ref(null)
let signInRendered = false

async function checkAuth () {
  user.value = await getCurrentUser()
}

onMounted(async () => {
  await checkAuth()
  await initAuth()

  if (route.query.login === 'true' && !user.value) {
    showLogin.value = true
    await nextTick()
    renderButton()
  }
})

watch(showLogin, async (val) => {
  if (val) {
    await nextTick()
    renderButton()
  }
})

watch(() => route.query.login, async (val) => {
  if (val === 'true' && !user.value) {
    showLogin.value = true
    await nextTick()
    renderButton()
  }
})

function renderButton () {
  if (signInRendered || !signInContainer.value) return
  signInRendered = true
  renderSignInButton(signInContainer.value)
}

onSignIn(async (loggedUser) => {
  user.value = loggedUser
  showLogin.value = false
  const redirect = route.query.redirect || '/create'
  router.push(redirect)
})

async function handleSignOut () {
  await signOut()
  user.value = null
}

function openFind () {
  if (!user.value) {
    showLogin.value = true
    return
  }
  findHash.value = ''
  findError.value = ''
  showFindModal.value = true
}

function handleFind () {
  if (!findHash.value.trim()) {
    findError.value = 'Please enter an event code'
    return
  }
  showFindModal.value = false
  router.push(`/join/${findHash.value.trim()}`)
}

async function openLogin () {
  if (user.value) {
    router.push('/create')
    return
  }
  showLogin.value = true
  await nextTick()
  renderButton()
}
</script>

<template>
  <main class="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
    <div class="text-center">
      <h1 class="mt-4 font-bold tracking-tight text-[#e34040] text-8xl">My<span class="text-[#64e34f]">Team</span></h1>
      <p class="mt-2 tracking-tight text-[#dedcdc] text-2xl">The Ultimate Soccer Organizer</p>
      <p class="mt-8 text-[#dedcdc]">Perfect app to effortlessly organize and coordinate soccer matches with your friends</p>
      <div class="mt-10 flex items-center justify-center gap-x-6">
        <button
          class="rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          @click="openLogin"
        >Create Match</button>
        <button
          class="rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          @click="openFind"
        >Find Match</button>
        <router-link
          class="rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          to="/tournament"
        >New Tournament</router-link>
        <router-link
          class="rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          to="/events"
        >All Events</router-link>
      </div>
      <div v-if="user" class="mt-6 flex items-center justify-center gap-4 text-sm">
        <span class="text-[#dedcdc]">Logged in as {{ user.displayName }}</span>
        <button class="text-red-400 hover:text-red-300" @click="handleSignOut">Sign out</button>
      </div>
    </div>
  </main>

  <Teleport to="body">
    <div v-if="showLogin" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" @click.self="showLogin = false">
      <div class="bg-[#1a1a1a] rounded-lg p-8 shadow-xl w-80">
        <h2 class="text-white text-lg font-semibold mb-6 text-center">Sign in to MyTeam</h2>
        <div ref="signInContainer" class="flex justify-center"></div>
        <button class="mt-6 text-sm text-[#dedcdc] hover:text-white w-full text-center" @click="showLogin = false">Cancel</button>
      </div>
    </div>

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
            class="flex-1 rounded-md bg-[#0b88de] px-4 py-2 text-sm font-semibold text-white hover:bg-[#50b1f3]"
            @click="handleFind"
          >Join</button>
          <button
            class="flex-1 rounded-md bg-gray-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-400"
            @click="showFindModal = false"
          >Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
