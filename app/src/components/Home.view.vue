<template>
  <main class="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
    <div class="text-center">
      <h1 class="mt-4 font-bold tracking-tight text-[#e34040] text-8xl">My<span class="text-[#64e34f]">Team</span></h1>
      <p class="mt-2 tracking-tight text-[#dedcdc] text-2xl">The Ultimate Soccer Organizer</p>
      <p class="mt-8 text-[#dedcdc]">Perfect app to effortlessly organize and coordinate soccer matches with your friends</p>
      <div class="mt-10 flex items-center justify-center gap-x-6">
        <router-link class="rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" to="/create">Create Match</router-link>
        <router-link class="rounded-md bg-[#0b88de] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#50b1f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" to="/match">Find Match</router-link>
      </div>
    </div>
  </main>
</template>

<script>
export default {
  setup() {
    return {
    }
  },
}
</script>
