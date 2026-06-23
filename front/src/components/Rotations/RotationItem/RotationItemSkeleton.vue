<template>
  <v-card
    v-for="i in 1"
    :key="i"
    class="mb-4 pa-4"
    rounded="xl"
    elevation="0"
  >
    <v-card-item>
      <div class="d-flex align-center">
  
        <v-skeleton-loader
          type="heading"
          width="160"
          class="mt-1"
        />
      </div>

      <v-skeleton-loader
        type="text"
        width="110"
        class="mt-4 mb-2"
      />

    </v-card-item>
  </v-card>
</template>

<style scoped>
:deep(.v-skeleton-loader .v-skeleton-loader__bone) {
  margin: 0;
}
</style>