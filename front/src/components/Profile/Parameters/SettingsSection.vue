<template>
  <section class="settings-section mb-8">
    <!-- Même titre que « Profil » : petit, gras, en couleur primaire -->
    <div class="d-flex align-center ga-2 px-0 mb-2">
      <h2 class="text-title-small font-weight-bold text-primary">{{ title }}</h2>
      <slot name="title-append" />
    </div>

    <slot name="intro" />

    <!-- Les lignes d'une même section sont reliées : grands arrondis aux extrémités, petits entre deux lignes -->
    <v-list class="settings-group pa-0" bg-color="transparent">
      <slot />
    </v-list>
  </section>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<style scoped>
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.settings-group :deep(.settings-row) {
  min-height: 64px;
  border-radius: 4px;
}

.settings-group :deep(.settings-row:first-child) {
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}

.settings-group :deep(.settings-row:last-child) {
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}
</style>
