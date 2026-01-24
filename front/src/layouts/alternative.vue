<template>
  <v-main>
    <router-view v-slot="{ Component, route }">
      <component :is="Component" />
    </router-view>
  </v-main>
</template>


<script setup>
// Layout minimaliste sans app bar ni navigation
</script>

<style scoped>

</style> 