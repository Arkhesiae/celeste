<template>
  <v-app-bar-title style="margin-left: 10px;" class="d-flex align-center" @click="$emit('title-click')">
    <div class="d-flex align-center ">
      <v-btn v-if="smAndDown" flat size="small" icon color="primary" :active="isHomepage || isDashboard">
        <Logo style="left: 1px; top: -2px; position: relative;" />
      </v-btn>
      <div v-else class="d-flex align-center">
        <Logo />

        <v-btn flat color="primary" class="text-overline" style="font-weight: 900 !important;"
          :active="isHomepage || isDashboard">
          {{ APP_TITLE }}
        </v-btn>
      </div>
      <v-hover v-slot="{ isHovering, props }">
        <v-slide-y-transition mode="out-in">
          <div v-if="!isHovering" class="d-flex align-center">
            <span v-bind="props" class="text-overline version-text text-medium-emphasis ml-2">
              {{ APP_VERSION }}
            </span>
          </div>
          <div v-else>
            <span v-bind="props" class="text-overline version-text text-medium-emphasis ml-2">
              {{ RELEASE_DATE }}
            </span>
          </div>
        </v-slide-y-transition>
      </v-hover>
    </div>
  </v-app-bar-title>
</template>

<script setup>

import { useDisplay } from 'vuetify';

// Constants
const APP_TITLE = "Céleste";
const APP_VERSION = "alpha-202601";
const RELEASE_DATE = "24/01/2026";

// Reactive data
const currentDate = ref('');
const { smAndDown } = useDisplay();

// Props
defineProps({
  isHomepage: {
    type: Boolean,
    default: false
  },
  isDashboard: {
    type: Boolean,
    default: false
  }
});

// Emits
defineEmits(['title-click']);

// Methods
const updateDate = () => {
  const now = new Date();
  currentDate.value = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Lifecycle
onMounted(() => {
  updateDate();
});
</script>
<style scoped>
.celeste-logo {
  width: 30px;
  height: 30px;

  margin-right: 5px;
}

.version-text {
  font-weight: 600 !important;
  font-size: 0.5rem !important;
}
</style>