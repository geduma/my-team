<script setup>
import { computed } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const isHome = computed(() => route.name === 'home')
</script>

<template>
  <video playsinline autoplay muted loop>
    <source src="/background.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <div class="overlay"></div>
  <RouterLink
    v-if="!isHome"
    to="/"
    class="fixed top-4 left-4 z-50 rounded-md bg-[#0b88de] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3]"
  >Home</RouterLink>
  <RouterView />
  <footer>
    <a href="https://geduma.com" target="_blank">by @geduma &#9749;</a>
  </footer>
</template>

<style scoped>
</style>
