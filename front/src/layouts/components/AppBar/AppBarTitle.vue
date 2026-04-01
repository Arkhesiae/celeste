<template>
  <v-app-bar-title style="margin-left: 10px;" class="d-flex align-center" @click="$emit('title-click')">
    <div class="d-flex align-center ">
      <v-btn v-if="smAndDown" flat size="small" icon :color="isDev ? 'error' : 'primary'"
        :active="isHomepage || isDashboard">
        <v-icon :color="isDev ? 'error' : 'primary'">
          <template v-if="isDev">
            mdi-dev-to
          </template>
          <template v-else>
            <Logo style="left: 1px; top: -2px; position: relative;" />
          </template>
        </v-icon>
      </v-btn>
      <div v-else class="d-flex align-center">
        <v-icon :color="isDev ? 'error' : 'primary'">
          <template v-if="isDev">
            mdi-dev-to
          </template>
          <template v-else>
            <Logo style="left: 1px; top: -2px; position: relative;" />
          </template>
        </v-icon>

        <v-btn flat :color="isDev ? 'error' : 'primary'" class="text-overline" style="font-weight: 900 !important;"
          :active="isHomepage || isDashboard">
          {{ APP_TITLE }}
        </v-btn>


      </div>
      <span v-if="isDev" class="text-overline version-text text-medium-emphasis ml-2">
        {{ userName }}
      </span>
    </div>
  </v-app-bar-title>
</template>

<script setup>

import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore.js';

// Constants
const APP_TITLE = "Céleste";

const isDev = ref(import.meta.env.DEV);
// Reactive data
const currentDate = ref('');
const { smAndDown } = useDisplay();

const authStore = useAuthStore();
const userName = computed(() => authStore.userData?.name);

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