<template>
  <!-- Page de chargement : rien autour d'elle -->
  <v-main>
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </v-main>
</template>
