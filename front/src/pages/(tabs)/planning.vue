<template>
  <div>
    <!-- Calendrier et grille de l'équipe, reliés en un seul groupe : l'un ou l'autre est affiché en dessous -->
    <v-container v-if="centerId" class="pb-0">
      <div class="d-flex justify-center mt-4">
        <v-btn-toggle
          :model-value="section"
          mandatory
          connected
          variant="flat"
          color="primary"
          :size="smAndDown ? 'small' : 'default'"
          aria-label="Planning"
          @update:model-value="goTo"
        >
          <v-btn value="calendar" prepend-icon="mdi-calendar-outline">Calendrier</v-btn>
          <v-btn value="grid" prepend-icon="mdi-view-week-outline">Grille</v-btn>
        </v-btn-toggle>
      </div>
    </v-container>

    <router-view />
  </div>
</template>

<script setup>
import { useScrollRestoration } from 'vue-router/experimental';

// Onglet du bas : racine de ses pages, il retrouve son défilement (router/scrollRestoration.js)
definePage({ meta: { tab: 'planning' } });
useScrollRestoration();

import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore.js';

const route = useRoute();
const router = useRouter();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();

// Un administrateur principal sans centre n'a pas de grille : il n'y a alors rien à alterner
const centerId = computed(() => authStore.userData.centerId);

// La section affichée est la fin de l'adresse : /planning/calendar ou /planning/grid
const section = computed(() => (route.path.endsWith('/grid') ? 'grid' : 'calendar'));

// La grille s'ouvre sur l'équipe de l'utilisateur (voir pages/planning/grid.vue)
const goTo = (value) => {
  if (value && value !== section.value) {
    router.push({ path: `/planning/${value}` });
  }
};
</script>
