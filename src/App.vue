<script setup>
import { computed } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const showHeader = computed(() => route.name !== 'home' && route.name !== 'auth-callback')
</script>

<template>
  <video playsinline autoplay muted loop>
    <source src="/background.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <div class="overlay"></div>
  <div class="flex flex-col min-h-screen">
    <div v-if="showHeader" class="sticky top-0 z-50 w-full bg-[#00000096] backdrop-blur-sm">
      <div class="mx-auto max-w-screen-xl px-4 py-3 sm:px-6 lg:px-8">
        <RouterLink
          to="/"
          class="inline-block rounded-md bg-[#0b88de] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3]"
        >Home</RouterLink>
      </div>
    </div>
    <div class="flex-1">
      <RouterView />
    </div>
    <footer>
      <a href="https://geduma.com" target="_blank">by @geduma &#9749;</a>
    </footer>
  </div>
</template>

<style scoped>
</style>
