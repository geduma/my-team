<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <video playsinline autoplay muted loop>
    <source src="/background.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <div class="overlay"></div>
  <RouterView />
  <footer>
    <a href="https://geduma.com" target="_blank">by @geduma &#9749;</a>
  </footer>
</template>

<style scoped>
</style>
